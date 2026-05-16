import os
import json
import base64
import io
from datetime import datetime
from flask import Flask, render_template, request, jsonify
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound
from PIL import Image

app = Flask(__name__)

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
            'grades': {}, 'createdAt': datetime.utcnow().isoformat()
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
    grades = d.get('grades', {})
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
        return jsonify({'success': True, 'student': item})
    except ClientError as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/all-students', methods=['GET'])
def all_students():
    try:
        resp = table.scan()
        items = resp.get('Items', [])
        for item in items:
            if 'grades' in item:
                item['grades'] = {k: float(v) for k, v in item['grades'].items()}
            item['pelanggaran'] = str(item.get('pelanggaran', ''))
        return jsonify({'success': True, 'students': items})
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
                        stu = r['Item']
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
                                'thumbnail': stu.get('thumbnail', ''),
                                'similarity': sim
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
