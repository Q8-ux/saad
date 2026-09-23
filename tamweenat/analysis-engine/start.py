import os
import uvicorn
uvicorn.run('masar.api:app', host='0.0.0.0', port=int(os.environ.get('PORT','8787')), workers=1, access_log=False)
