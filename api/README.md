# React Frontend + PHP API Backend

---

## 📦 Deployment Structure

When deploying to cPanel, organize like this:

````
/home/username/
│
├── public_html/                  # Web root
│   │
│   ├── index.html               # React build (production)
│   ├── assets/                  # React compiled assets
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── logo-[hash].png
│   │
│   ├── api/                     # PHP API
│   │   ├── index.php
│   │   ├── config.php
│   │   ├── .htaccess
│   │   │
│   │   ├── core/
│   │   ├── middleware/
│   │   └── controllers/
│   │
│   └── .htaccess                # Root htaccess
│
└── logs/
    ├── error_log
    └── access_log
```

**URL Structure:**
- Frontend: `https://yourdomain.com/`
- API: `https://yourdomain.com/api/`

---

## 🎯 Recommended Tech Stack

### Frontend
- **React** 18+ with Hooks
- **React Router** v6 for routing
- **Axios** for HTTP requests
- **Tailwind CSS** for styling
- **React Hook Form** for forms
- **React Query** for data fetching (optional)
- **Vite** for build tool (faster than CRA)

### Backend
- **PHP** 8.2+
- **PDO** for database
- **JWT** for authentication
- **Apache/Nginx** web server

---

## 📊 Performance Optimization

### Frontend
1. **Code splitting** - React.lazy() for pages
2. **Image optimization** - WebP format, lazy loading
3. **Bundle size** - Analyze with `vite-bundle-visualizer`
4. **Caching** - Service workers (PWA)

### Backend
1. **OPcache** enabled
2. **Database indexing** on frequently queried fields
3. **Response compression** (gzip)
4. **CDN** for static assets

---

## ✅ Checklist for Production

- [ ] Frontend build optimized (`npm run build`)
- [ ] Environment variables set correctly
- [ ] CORS configured for production domain
- [ ] SSL certificate installed (HTTPS)
- [ ] Database credentials secured
- [ ] JWT secret generated and unique
- [ ] Error logging enabled
- [ ] Rate limiting configured
- [ ] Security headers set (.htaccess)
- [ ] File permissions correct (644 for files, 755 for dirs)
- [ ] Backup strategy in place
- [ ] Monitoring setup (uptime, errors)

---

This structure is scalable, maintainable, and follows industry best practices! 🚀# smart-sb-api
