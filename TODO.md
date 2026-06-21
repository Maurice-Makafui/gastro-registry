- [ ] Inspect FastAPI CORS initialization in backend/app/main.py
- [ ] Apply CORS fix: ensure explicit allowed origins include Vercel frontend + localhost dev origins; keep credentials + wildcard methods/headers
- [ ] Ensure middleware order: CORS added before routers
- [ ] Verify OPTIONS preflight headers behavior via local test /debug/cors
- [ ] Record files modified, final CORS configuration, and test result

