import os
import json
import base64
import g4f
import io
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from flask import Flask, render_template, request, jsonify
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound
from PIL import Image
from mangum import Mangum
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
handler = Mangum(app)

def get_jakarta_time():
    # Mengambil waktu UTC+7 (WIB / Jakarta)
    return (datetime.now(timezone.utc) + timedelta(hours=7)).strftime('%Y-%m-%d %H:%M:%S')

def replace_decimals(obj):
    if isinstance(obj, list):
        return [replace_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: replace_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

# ─── Configuration ───
DYNAMODB_TABLE = os.getenv('DYNAMODB_TABLE', 'StudentGrades')
REKOG_COLLECTION = os.getenv('REKOGNITION_COLLECTION', 'student-faces')

# Teacher credentials (hardcoded)
TEACHER_CREDS = {'guru': 'gurusmakengo01!'}


def create_aws_session():
    """
    Create AWS session: tries AWS CLI credentials first (~/.aws/credentials),
    then falls back to environment variables.
    """
    region = os.getenv('AWS_REGION', 'us-east-1')
    
    # 1) Try default session (AWS CLI / shared credentials)
    try:
        sess = boto3.Session(region_name=region)
        sts = sess.client('sts')
        sts.get_caller_identity()
        print(f"[AWS] Using credentials from AWS CLI / shared config (Region: {region})")
        return sess
    except (NoCredentialsError, ProfileNotFound, ClientError):
        pass

    # 2) Fallback to env vars
    key = os.getenv('AWS_ACCESS_KEY_ID', '')
    secret = os.getenv('AWS_SECRET_ACCESS_KEY', '')
    token = os.getenv('AWS_SESSION_TOKEN', '')
    if key and secret:
        try:
            sess = boto3.Session(
                aws_access_key_id=key,
                aws_secret_access_key=secret,
                aws_session_token=token if token else None,
                region_name=region
            )
            sts = sess.client('sts')
            sts.get_caller_identity()
            print("[AWS] Using credentials from environment variables")
            return sess
        except (NoCredentialsError, ClientError) as e:
            print(f"[AWS] Env credentials failed: {e}")

    print("[AWS] WARNING: No valid credentials found!")
    return boto3.Session()


session = create_aws_session()
rekognition = session.client('rekognition')
dynamodb = session.resource('dynamodb')
table = dynamodb.Table(DYNAMODB_TABLE)


def ensure_collection():
    """Create Rekognition collection if it doesn't exist."""
    try:
        rekognition.create_collection(CollectionId=REKOG_COLLECTION)
        print(f"[OK] Created Rekognition collection: {REKOG_COLLECTION}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceAlreadyExistsException':
            print(f"[OK] Rekognition collection exists: {REKOG_COLLECTION}")
        else:
            print(f"[ERR] Collection error: {e}")


def ensure_table():
    """Create DynamoDB table if it doesn't exist."""
    try:
        client = session.client('dynamodb')
        client.create_table(
            TableName=DYNAMODB_TABLE,
            KeySchema=[{'AttributeName': 'studentId', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'studentId', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )
        print(f"[OK] Creating DynamoDB table: {DYNAMODB_TABLE} ...")
        waiter = client.get_waiter('table_exists')
        waiter.wait(TableName=DYNAMODB_TABLE)
        print(f"[OK] Table ready: {DYNAMODB_TABLE}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print(f"[OK] DynamoDB table exists: {DYNAMODB_TABLE}")
        else:
            print(f"[ERR] Table error: {e}")


def decode_image(data):
    """Extract raw bytes from a data URL or base64 string."""
    if ',' in data:
        data = data.split(',', 1)[1]
    return base64.b64decode(data)


# ═══════════════════════ ROUTES ═══════════════════════

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/login', methods=['POST'])
def login():
    d = request.json
    if TEACHER_CREDS.get(d.get('username')) == d.get('password'):
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/api/register-student', methods=['POST'])
def register_student():
    d = request.json
    sid = d.get('studentId', '').strip()
    name = d.get('name', '').strip()
    kelas = d.get('kelas', '').strip()
    agama = d.get('agama', '').strip()
    pelanggaran = str(d.get('pelanggaran', '')).strip()
    image = d.get('image', '')

    if not all([sid, name, kelas, agama, image]):
        return jsonify({'success': False, 'message': 'All fields are required'}), 400

    try:
        img_bytes = decode_image(image)

        resp = rekognition.index_faces(
            CollectionId=REKOG_COLLECTION,
            Image={'Bytes': img_bytes},
            ExternalImageId=sid,
            DetectionAttributes=['ALL'],
            MaxFaces=1,
            QualityFilter='AUTO'
        )

        if not resp.get('FaceRecords'):
            return jsonify({'success': False, 'message': 'No face detected in the photo'}), 400

        face_id = resp['FaceRecords'][0]['Face']['FaceId']

        # Make thumbnail
        img = Image.open(io.BytesIO(img_bytes))
        img.thumbnail((300, 300))
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=80)
        thumb = base64.b64encode(buf.getvalue()).decode()

        table.put_item(Item={
            'studentId': sid, 'name': name, 'kelas': kelas,
            'agama': agama, 'pelanggaran': pelanggaran, 'faceId': face_id, 'thumbnail': thumb,
            'grades': {}, 
            'grades_history': {}, 
            'violations_history': [], 
            'createdAt': get_jakarta_time()
        })

        return jsonify({'success': True, 'message': f'{name} registered successfully', 'faceId': face_id})

    except ClientError as e:
        return jsonify({'success': False, 'message': f'AWS: {e.response["Error"]["Message"]}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/save-grades', methods=['POST'])
def save_grades():
    d = request.json
    sid = d.get('studentId', '').strip()
    grades = {k: Decimal(str(v)) for k, v in d.get('grades', {}).items()}
    if not sid:
        return jsonify({'success': False, 'message': 'Student ID required'}), 400

    try:
        resp = table.get_item(Key={'studentId': sid})
        if 'Item' not in resp:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        table.update_item(
            Key={'studentId': sid},
            UpdateExpression='SET grades = :g, pelanggaran = :p',
            ExpressionAttributeValues={':g': grades, ':p': str(d.get('pelanggaran', '')).strip()}
        )
        return jsonify({'success': True, 'message': 'Data saved successfully'})

    except ClientError as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/add-event', methods=['POST'])
def add_event():
    d = request.json
    sid = d.get('studentId')
    evt_type = d.get('type') # 'grade' or 'violation'
    
    if not sid:
        return jsonify({'success': False, 'message': 'Student ID required'}), 400
        
    try:
        resp = table.get_item(Key={'studentId': sid})
        if 'Item' not in resp:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
            
        item = resp['Item']
        timestamp = get_jakarta_time()
        
        if evt_type == 'grade':
            subj = d.get('subject')
            score = Decimal(str(d.get('score', 0)))
            if 'grades_history' not in item: item['grades_history'] = {}
            if subj not in item['grades_history']:
                item['grades_history'][subj] = []
                if 'grades' in item and subj in item['grades']:
                    item['grades_history'][subj].append({
                        'score': item['grades'][subj],
                        'timestamp': item.get('createdAt', timestamp)
                    })
            
            item['grades_history'][subj].append({'score': score, 'timestamp': timestamp})
            
            # Hitung rata-rata dan simpan di 'grades' biar gampang dibaca frontend lama
            total = sum(e['score'] for e in item['grades_history'][subj])
            count = len(item['grades_history'][subj])
            if 'grades' not in item: item['grades'] = {}
            item['grades'][subj] = Decimal(str(round(float(total) / count, 1)))
            
        elif evt_type == 'violation':
            note = d.get('note')
            if 'violations_history' not in item: item['violations_history'] = []
            item['violations_history'].append({'note': note, 'timestamp': timestamp})
            
            # Update 'pelanggaran' string count untuk backwards compatibility
            item['pelanggaran'] = ",".join([v.get('note', 'Pelanggaran') for v in item['violations_history']])
            
        table.put_item(Item=item)
        return jsonify({'success': True, 'message': 'Event berhasil ditambahkan!', 'item': replace_decimals(item)})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/get-student/<sid>', methods=['GET'])
def get_student(sid):
    try:
        resp = table.get_item(Key={'studentId': sid})
        if 'Item' not in resp:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        item = resp['Item']
        if 'grades' in item:
            item['grades'] = {k: float(v) for k, v in item['grades'].items()}
        item['pelanggaran'] = str(item.get('pelanggaran', ''))
        return jsonify({'success': True, 'student': replace_decimals(item)})
    except ClientError as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/generate-ai-text', methods=['POST'])
def generate_ai_text():
    try:
        data = request.json
        student = data.get('student', {})
        top_keys = data.get('topKeys', [])
        top_val = data.get('topVal', 0)
        subjects = data.get('subjects', [])
        
        name = student.get('name', 'Siswa')
        kelas = student.get('kelas', 'Umum')
        agama = student.get('agama', 'Tidak Diketahui')
        violations_list = student.get('violations_history', [])
        violations = len(violations_list)
        violations_notes = ", ".join([v.get('note', 'Pelanggaran') for v in violations_list]) if violations_list else "Tidak Ada"
        
        # Build list of grades for prompt
        grades_str = ", ".join([f"{s.get('name')}: {s.get('val')}" for s in subjects])
        top_subjects_str = ", ".join([s.get('name', '') for s in subjects if s.get('key') in top_keys])
        
        prompt = f"""
        Kamu adalah AI Kios FaceGrade yang bertugas membuat julukan (title) dan tagline (kata-kata mutiara/lucu) untuk poster siswa berdasarkan prestasi akademis, agama, dan catatan pelanggaran di sekolah.
        
        Data Siswa:
        - Nama: {name}
        - Kelas: {kelas}
        - Agama: {agama}
        - Jumlah Pelanggaran: {violations}
        - Detail Catatan Pelanggaran: {violations_notes}
        - Nilai Semua Mapel: {grades_str}
        - Mapel Paling Unggul (Nilai {top_val}): {top_subjects_str}
        
        Tugas Anda:
        Buatlah 1 Julukan (title) dan 1 Tagline (kata-kata mutiara/quotes) yang lucu, kocak, seru, dan sangat sesuai dengan Julukan tersebut.
        
        ATURAN UTAMA - KASUS PELANGGARAN & NILAI RATA-RATA:
        - JIKA SISWA MEMILIKI CATATAN PELANGGARAN (tidak kosong/tidak 'Tidak Ada') DAN nilainya biasa saja (rata-rata 70-85), Anda WAJIB membuat Julukan dan Tagline berdasarkan pelanggaran tersebut, bukan nilai akademisnya!
          Contoh:
          * Pelanggaran: 'Tidur di kelas' -> Julukan: "Calon Menteri" atau "Bupati Turu" atau "Raja Turu". Tagline: "Latihan simulasi tidur pas rapat paripurna DPR di masa depan." (Sangat Lucu!)
          * Pelanggaran: 'Main mobile legends saat guru menerangkan' -> Julukan: "Atlet Mabar" atau "Pro Player". Tagline: "Pecah rank Mythic lebih penting daripada memikirkan nasib bangsa."
          * Pelanggaran: 'Terlambat masuk sekolah' -> Julukan: "Pawang Gerbang" atau "Raja Telat". Tagline: "Datang jam 8 biar gerbang sekolah serasa gerbang istana pribadi."
          * Pelanggaran: 'Uang kas kelas nunggak / uang kas hilang' -> Julukan: "Calon Koruptor" atau "Menteri Keuangan". Tagline: "Latihan korupsi uang kas kelas demi membiayai seblak pacar tercinta."
          * Pelanggaran: 'Suka bolos ke kantin' -> Julukan: "Camat Kantin" atau "Gubernur Lapar". Tagline: "Rapat paripurna di meja kantin membahas subsidi gorengan gratis."
        
        ATURAN KHUSUS - BULE JAWA:
        Jika nilai English (Bahasa Inggris) DAN Bahasa Jawa sama-sama tinggi/unggul (di atas 85), berikan Julukan (title): "Bule Jawa" (HARUS PERSIS INI).
        Dan buatlah Tagline campuran Bahasa Inggris dan Jawa medok yang super kocak (contoh: "Which is kulo niku saestu bingung jal!", "I am sorry ndak sengaja jal!", "Hello guys, monggo pinarak yo!").
        
        ATURAN UMUM JULUKAN (TITLE):
        - Julukan (title) HARUS TEPAT 2 KATA! (Contoh: "Calon Presiden", "Calon Menteri", "Calon Koruptor", "Capres Kantin", "Ustadz Gaul", "Romo Santuy", "Pendeta Digital", "Junzi Modern", "Bupati Turu", "Camat Kantin"). Jangan lebih atau kurang dari 2 kata!
        - BOLEH gunakan kata keagamaan yang akrab seperti 'Ustadz', 'Romo', 'Pendeta', 'Junzi' jika nilai Agama mereka sangat tinggi (misal: 'Ustadz Gaul', 'Romo Santuy', 'Pendeta Digital', 'Junzi Modern'). Jangan buat kombinasi anomali seperti 'Ustadz Digital' yang aneh. HINDARI kata kuno/kaku seperti 'Saint' atau 'Ksatria'.
        - Julukan harus sangat kreatif, seru, menyindir secara humoris, sesuai keunggulan mapel, agama, atau catatan pelanggarannya!
        
        ATURAN TAGLINE:
        - Tagline harus sangat lucu, kocak, seru, anak sekolah banget, dan mengandung sindiran politik berani yang menghibur (seperti korupsi seblak, rapat paripurna molor, visi misi kenyang bersama). Boleh agak panjang agar lucu maksimal.
        
        Ketentuan Output:
        - Format respon harus berupa JSON valid seperti ini:
        {{
          "title": "isi_julukan_disini",
          "tagline": "isi_tagline_disini"
        }}
        - JANGAN TULIS APAPUN SELAIN JSON! Jangan ada markdown ```json atau penjelasan lainnya. Hanya mentah JSON saja.
        """
        
        # Call g4f
        response = g4f.ChatCompletion.create(
            model=g4f.models.default,
            messages=[{"role": "user", "content": prompt}],
        )
        
        clean_resp = response.strip()
        start_idx = clean_resp.find('{')
        end_idx = clean_resp.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_resp = clean_resp[start_idx:end_idx+1]
            
        res_json = json.loads(clean_resp)
        return jsonify({
            'success': True,
            'title': res_json.get('title', 'Siswa Berprestasi'),
            'tagline': res_json.get('tagline', 'Tetap santai walau nilai badai.')
        })
    except Exception as e:
        print("G4F Error:", str(e))
        return jsonify({
            'success': False,
            'message': str(e),
            'title': 'Siswa Berbakat',
            'tagline': 'Belajar terus sampai sukses.'
        }), 200


@app.route('/api/all-students', methods=['GET'])
def all_students():
    try:
        resp = table.scan()
        items = resp.get('Items', [])
        for item in items:
            if 'grades' in item:
                item['grades'] = {k: float(v) for k, v in item['grades'].items()}
            item['pelanggaran'] = str(item.get('pelanggaran', ''))
        return jsonify({'success': True, 'students': replace_decimals(items)})
    except ClientError as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    d = request.json
    image = d.get('image', '')
    if not image:
        return jsonify({'success': False, 'message': 'Image required'}), 400

    try:
        img_bytes = decode_image(image)

        # Detect all faces
        detect = rekognition.detect_faces(Image={'Bytes': img_bytes}, Attributes=['ALL'])
        faces = detect.get('FaceDetails', [])

        if not faces:
            return jsonify({'success': False, 'message': 'No face detected'}), 400

        # Build analysis for each face
        analyses = []
        for i, f in enumerate(faces):
            bb = f['BoundingBox']
            analyses.append({
                'index': i,
                'box': {'l': bb['Left'], 't': bb['Top'], 'w': bb['Width'], 'h': bb['Height']},
                'age': {'low': f.get('AgeRange', {}).get('Low', 0), 'high': f.get('AgeRange', {}).get('High', 0)},
                'gender': f.get('Gender', {}).get('Value', '?'),
                'emotions': [{'type': e['Type'], 'conf': round(e['Confidence'], 1)}
                             for e in sorted(f.get('Emotions', []), key=lambda x: -x['Confidence'])[:3]],
                'smile': f.get('Smile', {}).get('Value', False),
                'glasses': f.get('Eyeglasses', {}).get('Value', False),
                'confidence': round(f.get('Confidence', 0), 1),
                'matched': False, 'student': None
            })

        # Search for matches
        try:
            search = rekognition.search_faces_by_image(
                CollectionId=REKOG_COLLECTION,
                Image={'Bytes': img_bytes},
                MaxFaces=10, FaceMatchThreshold=80
            )
            for m in search.get('FaceMatches', []):
                ext_id = m['Face'].get('ExternalImageId', '')
                sim = round(m['Similarity'], 1)
                try:
                    r = table.get_item(Key={'studentId': ext_id})
                    if 'Item' in r:
                        stu = replace_decimals(r['Item'])
                        if 'grades' in stu:
                            stu['grades'] = {k: float(v) for k, v in stu['grades'].items()}

                        # Match to closest unmatched face
                        sbb = search.get('SearchedFaceBoundingBox', {})
                        best_i, best_d = 0, float('inf')
                        for a in analyses:
                            if not a['matched']:
                                dist = abs(a['box']['l'] - sbb.get('Left', 0)) + abs(a['box']['t'] - sbb.get('Top', 0))
                                if dist < best_d:
                                    best_d = dist
                                    best_i = a['index']

                        if not analyses[best_i]['matched']:
                            analyses[best_i]['matched'] = True
                            analyses[best_i]['student'] = {
                                'studentId': stu['studentId'], 'name': stu['name'],
                                'kelas': stu['kelas'], 'agama': stu.get('agama', ''),
                                'pelanggaran': str(stu.get('pelanggaran', '')),
                                'grades': stu.get('grades', {}),
                                'grades_history': stu.get('grades_history', {}),
                                'thumbnail': stu.get('thumbnail', ''),
                                'similarity': sim,
                                'violations_history': stu.get('violations_history', [])
                            }
                except Exception:
                    pass
        except rekognition.exceptions.InvalidParameterException:
            pass  # No searchable face

        return jsonify({'success': True, 'total': len(faces), 'faces': analyses})

    except ClientError as e:
        return jsonify({'success': False, 'message': f'AWS: {e.response["Error"]["Message"]}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/delete-student/<sid>', methods=['DELETE'])
def delete_student(sid):
    try:
        resp = table.get_item(Key={'studentId': sid})
        if 'Item' not in resp:
            return jsonify({'success': False, 'message': 'Not found'}), 404

        fid = resp['Item'].get('faceId')
        if fid:
            try:
                rekognition.delete_faces(CollectionId=REKOG_COLLECTION, FaceIds=[fid])
            except Exception:
                pass

        table.delete_item(Key={'studentId': sid})
        return jsonify({'success': True, 'message': 'Student deleted'})
    except ClientError as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("  FaceGrade AI — Starting")
    print("=" * 50)
    ensure_collection()
    ensure_table()
    app.run(debug=True, host='0.0.0.0', port=5000)
