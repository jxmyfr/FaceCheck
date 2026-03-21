from fastapi import FastAPI

app = FastAPI(title='FaceCheck API')

@app.get('/')
def read_root():
    return {'message': 'FaceCheck Backend is running'}