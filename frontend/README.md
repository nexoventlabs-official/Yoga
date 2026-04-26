# Himalayan Yoga — Admin Panel

React + Vite + Tailwind admin console.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

Set `VITE_API_URL` in `.env` to your backend URL (default `http://localhost:5000/api`).

## Pages

| Path | Page |
|---|---|
| `/login` | Admin login |
| `/` | Dashboard |
| `/registered` | Registered users |
| `/non-registered` | Contacts who never registered |
| `/events` | Events CRUD (image upload to Cloudinary) |
| `/enquiries` | Enquiry inbox + status workflow |
| `/flow-images` | Upload banners & icons used by the flow |
