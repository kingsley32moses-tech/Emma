require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA = process.env.DATA_DIR || path.join(ROOT, "data");
const UPLOADS = process.env.UPLOADS_DIR || path.join(ROOT, "uploads");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

if (process.env.NODE_ENV === "production") {
  const sessionSecret = process.env.SESSION_SECRET || "";
  if (sessionSecret.length < 32 || /replace-this|development-only/i.test(sessionSecret)) {
    throw new Error("Set SESSION_SECRET to a unique random value of at least 32 characters in your production environment.");
  }
  const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || "";
  if (initialAdminPassword.length < 12 || /web234|change-me|replace-this/i.test(initialAdminPassword)) {
    throw new Error("Set ADMIN_INITIAL_PASSWORD to a unique password of at least 12 characters in your production environment.");
  }
}

const db = new Database(path.join(DATA, "emmas-decor.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
 id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 must_change_password INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 phone TEXT DEFAULT '', password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS enquiries (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, name TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT NOT NULL,
 event_type TEXT NOT NULL, event_date TEXT DEFAULT '', venue TEXT DEFAULT '', guests TEXT DEFAULT '',
 budget TEXT DEFAULT '', details TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'New',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, client_name TEXT NOT NULL, phone TEXT DEFAULT '',
 event_type TEXT NOT NULL, event_date TEXT NOT NULL, venue TEXT DEFAULT '',
 status TEXT NOT NULL DEFAULT 'Tentative', notes TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL, customer_id INTEGER NOT NULL,
 amount_mwk REAL NOT NULL, method TEXT NOT NULL, reference TEXT NOT NULL, customer_note TEXT DEFAULT '',
 status TEXT NOT NULL DEFAULT 'Pending verification', admin_note TEXT DEFAULT '',
 submitted_at TEXT DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT,
 FOREIGN KEY(booking_id) REFERENCES bookings(id), FOREIGN KEY(customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS portfolio (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT DEFAULT 'Event decor',
 image TEXT NOT NULL, description TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS testimonials (
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT NOT NULL, quote TEXT NOT NULL,
 event_type TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS availability_overrides (event_date TEXT PRIMARY KEY, capacity INTEGER, unavailable INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '', updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vendors (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT DEFAULT '',
 location TEXT DEFAULT '', phone TEXT DEFAULT '', website TEXT DEFAULT '',
 description TEXT DEFAULT '', approved INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS materials (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT DEFAULT '',
 description TEXT DEFAULT '', image_url TEXT DEFAULT '', unit TEXT DEFAULT 'item',
 price_mwk REAL, price_type TEXT NOT NULL DEFAULT 'quote',
 quantity_available INTEGER, vendor_id INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(vendor_id) REFERENCES vendors(id)
);
CREATE TABLE IF NOT EXISTS event_plans (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, title TEXT NOT NULL,
 event_type TEXT DEFAULT '', event_date TEXT DEFAULT '', location TEXT DEFAULT '',
 guests INTEGER DEFAULT 0, theme TEXT DEFAULT '', colours TEXT DEFAULT '',
 selections_json TEXT NOT NULL DEFAULT '[]', estimated_total REAL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'Draft', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES customers(id)
);
`);

// Safe schema upgrades for databases created by earlier project versions.
for (const [table, column, definition] of [
  ["materials", "quantity_available", "INTEGER"],
  ["enquiries", "customer_id", "INTEGER"],
  ["bookings", "customer_id", "INTEGER"],
  ["bookings", "deposit_due", "REAL NOT NULL DEFAULT 0"],
  ["bookings", "total_due", "REAL NOT NULL DEFAULT 0"]
]) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

const initialEmail = (process.env.ADMIN_EMAIL || "admin@emmasdecormw.com").trim().toLowerCase();
const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "web234";
if (!db.prepare("SELECT id FROM admins LIMIT 1").get()) {
  db.prepare("INSERT INTO admins (email,password_hash,must_change_password) VALUES (?,?,1)")
    .run(initialEmail, bcrypt.hashSync(initialPassword, 12));
}
const seedServices = [
  ["Wedding Decorations", "Thoughtfully styled wedding spaces, from the ceremony setting to the reception details."],
  ["Engagement Celebrations", "Elegant décor for engagement ceremonies and family celebrations."],
  ["Bridal Showers", "Beautiful, welcoming styling for bridal showers and special gatherings."],
  ["Send-off Ceremonies", "A memorable setting for celebrating a new chapter."],
  ["Corporate Functions", "Polished event styling for corporate dinners, launches and functions."],
  ["Church & Special Events", "Considered décor for church functions and other meaningful occasions."]
];
// Idempotently add publicly listed services without overwriting admin edits.
const existingService = db.prepare("SELECT id FROM services WHERE lower(title)=lower(?) LIMIT 1");
const insertService = db.prepare("INSERT INTO services (title,description,sort_order) VALUES (?,?,?)");
seedServices.forEach((service,i) => {
  if (!existingService.get(service[0])) insertService.run(service[0],service[1],i);
});
const defaults = {
  business_name: "Emma's Decor Mw",
  phone: process.env.BUSINESS_PHONE || "+265 995 215 629",
  whatsapp: process.env.BUSINESS_WHATSAPP || "265995215629",
  location: process.env.BUSINESS_LOCATION || "Area 14, Lilongwe, Malawi",
  service_area: process.env.BUSINESS_SERVICE_AREA || "Please enquire about your event location",
  business_hours: process.env.BUSINESS_HOURS || "Contact us for availability",
  facebook: process.env.BUSINESS_FACEBOOK || "https://www.facebook.com/1654114991278447/",
  tagline: "Beautifully considered spaces for life's special moments.",
  about: "We create welcoming, memorable event settings with thoughtful styling and attention to detail. Tell us about your occasion and the atmosphere you have in mind.",
  daily_capacity: "1"
};
const settingInsert = db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)");
Object.entries(defaults).forEach(([k,v]) => settingInsert.run(k,v));

app.disable("x-powered-by");
// Render and similar platforms terminate TLS at a reverse proxy.
if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: DATA }),
  secret: process.env.SESSION_SECRET || "development-only-change-this-session-secret",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 8 *  60 * 60 * 1000 }
}));
app.use("/uploads", express.static(UPLOADS, { maxAge: "7d" }));
app.use(express.static(path.join(ROOT, "public")));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req,_file,cb) => cb(null, UPLOADS),
    filename: (_req,file,cb) => {
      const extensions = { "image/jpeg":".jpg", "image/png":".png", "image/webp":".webp", "image/avif":".avif" };
      const ext = extensions[file.mimetype] || ".img";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req,file,cb) => {
    if (!["image/jpeg","image/png","image/webp","image/avif"].includes(file.mimetype)) return cb(new Error("Please upload a JPG, PNG, WEBP or AVIF image."));
    cb(null,true);
  }
});

function requireAdmin(req,res,next) {
  if (!req.session.adminId) return res.status(401).json({ error: "Please sign in." });
  // Enforce the first-login password change on the server, not only in the UI.
  const allowedDuringSetup = ["/api/admin/me", "/api/admin/password", "/api/admin/logout"];
  if (req.session.mustChangePassword && !allowedDuringSetup.includes(req.path)) {
    return res.status(403).json({ error: "Change your temporary password before using the admin workspace." });
  }
  next();
}
function settingsObject() {
  return Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x => [x.key,x.value]));
}
function clean(v, max=2000) { return String(v ?? "").trim().slice(0,max); }
function validEventDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value; }
function availabilityForDate(date, excludeBookingId=null) {
  const base=Math.max(1,Math.min(30,Number(settingsObject().daily_capacity)||1));
  const override=db.prepare("SELECT * FROM availability_overrides WHERE event_date=?").get(date);
  const capacity=override && override.capacity!==null ? Math.max(0,Math.min(30,Number(override.capacity)||0)) : base;
  const params=[date]; let sql="SELECT COUNT(*) AS n FROM bookings WHERE event_date=? AND status NOT IN ('Cancelled','Completed')";
  if(excludeBookingId){sql+=" AND id<>?";params.push(excludeBookingId)}
  const booked=Number(db.prepare(sql).get(...params).n);
  const unavailable=!!(override && override.unavailable);
  return {date,capacity,booked,available:unavailable?0:Math.max(0,capacity-booked),unavailable,fully_booked:unavailable || booked>=capacity};
}
function bookingCapacityError(date, excludeBookingId=null) {
  const a=availabilityForDate(date,excludeBookingId);
  if(a.unavailable || a.available<1) return `This date is fully booked. Please choose another date or contact Emma's Decor to discuss options.`;
  return null;
}
function validPublicUrl(value) {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
function imageSignatureMatches(file) {
  const b = fs.readFileSync(file.path);
  const mime = file.mimetype;
  if (mime === "image/jpeg") return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/png") return b.length > 8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/webp") return b.length > 12 && b.toString("ascii",0,4) === "RIFF" && b.toString("ascii",8,12) === "WEBP";
  if (mime === "image/avif") return b.length > 12 && b.toString("ascii",4,8) === "ftyp" && /avif|avis/.test(b.toString("ascii",8,16));
  return false;
}

app.get("/api/health", (_req,res) => res.json({ ok:true, service:"emmas-decor-mw" }));

app.get("/api/site", (_req,res) => {
  res.json({
    settings: settingsObject(),
    services: db.prepare("SELECT id,title,description FROM services WHERE active=1 ORDER BY sort_order,id").all(),
    portfolio: db.prepare("SELECT id,title,category,image,description FROM portfolio ORDER BY id DESC LIMIT 24").all(),
    testimonials: db.prepare("SELECT id,client_name,quote,event_type FROM testimonials WHERE active=1 ORDER BY id DESC LIMIT 8").all()
  });
});

app.get("/api/availability", (req,res) => {
  const date=clean(req.query.date,10);
  if(!validEventDate(date)) return res.status(400).json({error:"Choose a valid event date."});
  res.json(availabilityForDate(date));
});
app.get("/api/availability/month", (req,res) => {
  const month=clean(req.query.month,7);
  if(!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({error:"Choose a valid month."});
  const [year,monthNumber]=month.split('-').map(Number);
  if(monthNumber<1||monthNumber>12) return res.status(400).json({error:"Choose a valid month."});
  const count=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  const days=Array.from({length:count},(_,i)=>availabilityForDate(`${month}-${String(i+1).padStart(2,'0')}`));
  res.json({month,days});
});

app.post("/api/enquiries", rateLimit({ windowMs: 60*60*1000, limit: 8 }), (req,res) => {
  const name=clean(req.body.name,120), phone=clean(req.body.phone,50), eventType=clean(req.body.event_type,100);
  const email=clean(req.body.email,160);
  const eventDate=clean(req.body.event_date,30);
  if (!name || !phone || !eventType) return res.status(400).json({ error: "Please complete your name, phone number and event type." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Please enter a valid email address."});
  if (eventDate && !validEventDate(eventDate)) return res.status(400).json({error:"Please enter a valid event date."});
  if (eventDate && availabilityForDate(eventDate).available<1) return res.status(409).json({error:"That date currently has no available booking spots. Please choose another date or contact Emma’s Decor."});
  const result = db.prepare(`INSERT INTO enquiries (customer_id,name,email,phone,event_type,event_date,venue,guests,budget,details)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(req.session.customerId || null,name,email,phone,eventType,eventDate,clean(req.body.venue,180),clean(req.body.guests,40),clean(req.body.budget,80),clean(req.body.details,2000));
  res.status(201).json({ ok:true, id:result.lastInsertRowid, message:"Thank you. Your enquiry has been received." });
});

const customerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
function requireCustomer(req,res,next) {
  if (!req.session.customerId) return res.status(401).json({ error: "Please sign in to your customer account." });
  next();
}
app.post("/api/customer/register", customerLimiter, async (req,res) => {
  const name=clean(req.body.name,120), email=clean(req.body.email,160).toLowerCase();
  const phone=clean(req.body.phone,50), password=String(req.body.password || "");
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Enter your name and a valid email address."});
  if (password.length < 10) return res.status(400).json({error:"Your password must contain at least 10 characters."});
  if (db.prepare("SELECT id FROM customers WHERE email=?").get(email)) return res.status(409).json({error:"An account with this email already exists. Please sign in."});
  const info=db.prepare("INSERT INTO customers (name,email,phone,password_hash) VALUES (?,?,?,?)").run(name,email,phone,await bcrypt.hash(password,12));
  if(phone){db.prepare("UPDATE bookings SET customer_id=? WHERE customer_id IS NULL AND phone=?").run(Number(info.lastInsertRowid),phone);db.prepare("UPDATE enquiries SET customer_id=? WHERE customer_id IS NULL AND phone=?").run(Number(info.lastInsertRowid),phone);}
  req.session.regenerate(err => {
    if (err) return res.status(500).json({error:"Could not start a secure session."});
    req.session.customerId=Number(info.lastInsertRowid); req.session.customerEmail=email;
    res.status(201).json({ok:true,name,email});
  });
});
app.post("/api/customer/login", customerLimiter, async (req,res) => {
  const email=clean(req.body.email,160).toLowerCase(), password=String(req.body.password || "");
  const customer=db.prepare("SELECT * FROM customers WHERE email=?").get(email);
  if (!customer || !(await bcrypt.compare(password,customer.password_hash))) return res.status(401).json({error:"Email or password is incorrect."});
  req.session.regenerate(err => {
    if (err) return res.status(500).json({error:"Could not start a secure session."});
    req.session.customerId=customer.id; req.session.customerEmail=customer.email;
    res.json({ok:true,name:customer.name,email:customer.email});
  });
});
app.get("/api/customer/me", requireCustomer, (req,res) => {
  const customer=db.prepare("SELECT id,name,email,phone,created_at FROM customers WHERE id=?").get(req.session.customerId);
  if (!customer) return res.status(401).json({error:"Customer account not found."});
  res.json(customer);
});
app.get("/api/customer/enquiries", requireCustomer, (req,res) => {
  res.json(db.prepare("SELECT id,event_type,event_date,venue,status,created_at FROM enquiries WHERE customer_id=? ORDER BY id DESC").all(req.session.customerId));
});
app.get("/api/customer/bookings", requireCustomer, (req,res) => {
  const bookings=db.prepare("SELECT id,event_type,event_date,venue,status,notes,deposit_due,total_due,created_at FROM bookings WHERE customer_id=? ORDER BY event_date DESC").all(req.session.customerId);
  const getPayments=db.prepare("SELECT id,amount_mwk,method,reference,status,admin_note,submitted_at,reviewed_at FROM payments WHERE booking_id=? AND customer_id=? ORDER BY id DESC");
  res.json(bookings.map(b=>{const payments=getPayments.all(b.id,req.session.customerId);const paid=payments.filter(p=>p.status==="Confirmed").reduce((n,p)=>n+Number(p.amount_mwk),0);return {...b,payments,paid_confirmed:paid,balance_due:Math.max(0,Number(b.total_due||0)-paid)}}));
});
app.post("/api/customer/bookings/:id/payments", requireCustomer, rateLimit({windowMs:15*60*1000,limit:8}), (req,res) => {
  const booking=db.prepare("SELECT id,deposit_due,total_due FROM bookings WHERE id=? AND customer_id=?").get(Number(req.params.id),req.session.customerId);
  if(!booking) return res.status(404).json({error:"Booking not found."});
  const amount=Number(req.body.amount_mwk), method=clean(req.body.method,40), reference=clean(req.body.reference,100);
  if(!Number.isFinite(amount)||amount<=0||amount>1000000000) return res.status(400).json({error:"Enter a valid amount paid."});
  if(!["TNM Mpamba","Airtel Money","Bank transfer","Cash"].includes(method)) return res.status(400).json({error:"Choose a listed payment method."});
  if(!reference) return res.status(400).json({error:"Enter the transaction reference or receipt number. For cash, enter the receipt number."});
  if(Number(booking.total_due)>0){const already=db.prepare("SELECT COALESCE(SUM(amount_mwk),0) AS n FROM payments WHERE booking_id=? AND status IN ('Pending verification','Confirmed')").get(booking.id).n;if(Number(already)+amount>Number(booking.total_due))return res.status(400).json({error:"This amount would exceed the remaining quotation balance. Please check the amount with Emma's Decor."});}
  if(db.prepare("SELECT id FROM payments WHERE booking_id=? AND customer_id=? AND reference=?").get(booking.id,req.session.customerId,reference)) return res.status(409).json({error:"That transaction reference has already been submitted for this booking."});
  const info=db.prepare("INSERT INTO payments (booking_id,customer_id,amount_mwk,method,reference,customer_note) VALUES (?,?,?,?,?,?)")
    .run(booking.id,req.session.customerId,amount,method,reference,clean(req.body.customer_note,500));
  res.status(201).json({ok:true,id:info.lastInsertRowid,status:"Pending verification",message:"Payment submitted. Emma's Decor will verify it and update your booking."});
});
app.post("/api/customer/logout", requireCustomer, (req,res) => req.session.destroy(() => res.json({ok:true})));


// Event Designer: public catalogue contains only active items linked to Emma-approved vendors.
app.get("/api/planner/catalogue", (_req,res) => {
 const items=db.prepare(`SELECT m.id,m.name,m.category,m.description,m.image_url,m.unit,m.price_mwk,m.price_type,m.quantity_available,
 v.name AS vendor_name,v.location AS vendor_location,v.phone AS vendor_phone
 FROM materials m LEFT JOIN vendors v ON v.id=m.vendor_id
 WHERE m.active=1 AND (m.vendor_id IS NULL OR v.approved=1) ORDER BY m.category,m.name`).all();
 res.json({materials:items});
});
app.post("/api/planner/plans", requireCustomer, (req,res) => {
 const title=clean(req.body.title,120)||"My event plan";
 const selections=Array.isArray(req.body.selections)?req.body.selections:[];
 if (selections.length>100) return res.status(400).json({error:"Too many selections."});
 const validIds=selections.map(x=>Number(x.id)).filter(Number.isInteger);
 const allowed=validIds.length?db.prepare(`SELECT id,price_mwk,price_type FROM materials WHERE active=1 AND id IN (${validIds.map(()=>"?").join(",")})`).all(...validIds):[];
 const allowedMap=new Map(allowed.map(x=>[x.id,x]));
 let total=0;
 const cleanSelections=selections.map(x=>{const id=Number(x.id),m=allowedMap.get(id); if(!m)return null; const qty=Math.max(1,Math.min(1000,Number(x.quantity)||1)); if(m.price_type==="fixed" && Number.isFinite(Number(m.price_mwk))) total+=Number(m.price_mwk)*qty; return {id,quantity:qty};}).filter(Boolean);
 const info=db.prepare(`INSERT INTO event_plans (customer_id,title,event_type,event_date,location,guests,theme,colours,selections_json,estimated_total)
 VALUES (?,?,?,?,?,?,?,?,?,?)`).run(req.session.customerId,title,clean(req.body.event_type,80),clean(req.body.event_date,30),clean(req.body.location,180),Math.max(0,Math.min(10000,Number(req.body.guests)||0)),clean(req.body.theme,100),clean(req.body.colours,120),JSON.stringify(cleanSelections),total);
 res.status(201).json({ok:true,id:info.lastInsertRowid,estimated_total:total,message:"Your event plan has been saved."});
});
app.get("/api/customer/plans", requireCustomer, (req,res)=>res.json(db.prepare("SELECT * FROM event_plans WHERE customer_id=? ORDER BY id DESC").all(req.session.customerId)));
app.get("/api/admin/materials", requireAdmin, (_req,res)=>res.json(db.prepare("SELECT * FROM materials ORDER BY id DESC").all()));
app.post("/api/admin/materials", requireAdmin, (req,res)=>{
 const name=clean(req.body.name,120); if(!name)return res.status(400).json({error:"Material name is required."});
 if(req.body.quantity_available!==undefined&&req.body.quantity_available!==null&&req.body.quantity_available!==""&&(!Number.isInteger(Number(req.body.quantity_available))||Number(req.body.quantity_available)<0||Number(req.body.quantity_available)>100000))return res.status(400).json({error:"Available quantity must be a whole number from 0 to 100,000, or left blank."});
 if(req.body.price_mwk!==undefined&&req.body.price_mwk!==null&&req.body.price_mwk!==""&&(!Number.isFinite(Number(req.body.price_mwk))||Number(req.body.price_mwk)<0))return res.status(400).json({error:"Enter a valid non-negative price."});
 const info=db.prepare(`INSERT INTO materials (name,category,description,image_url,unit,price_mwk,price_type,quantity_available,vendor_id,active) VALUES (?,?,?,?,?,?,?,?,?,?)`)
 .run(name,clean(req.body.category,80),clean(req.body.description,500),clean(req.body.image_url,500),clean(req.body.unit,40)||"item",req.body.price_mwk===""?null:Number(req.body.price_mwk),req.body.price_type==="fixed"?"fixed":"quote",req.body.quantity_available===""||req.body.quantity_available==null?null:Math.max(0,Math.floor(Number(req.body.quantity_available))),req.body.vendor_id?Number(req.body.vendor_id):null,req.body.active===0?0:1);
 res.status(201).json({ok:true,id:info.lastInsertRowid});
});
app.patch("/api/admin/materials/:id", requireAdmin, (req,res)=>{
 const allowed=["name","category","description","image_url","unit","price_mwk","price_type","quantity_available","vendor_id","active"];
 const fields=allowed.filter(k=>Object.hasOwn(req.body,k)); if(!fields.length)return res.status(400).json({error:"No changes supplied."});
 if(fields.includes("quantity_available")&&req.body.quantity_available!==null&&req.body.quantity_available!==""&&(!Number.isInteger(Number(req.body.quantity_available))||Number(req.body.quantity_available)<0||Number(req.body.quantity_available)>100000))return res.status(400).json({error:"Available quantity must be a whole number from 0 to 100,000, or left blank."});
 db.prepare(`UPDATE materials SET ${fields.map(k=>k+"=?").join(",")} WHERE id=?`).run(...fields.map(k=>k==="quantity_available"?(req.body[k]===""||req.body[k]===null?null:Math.max(0,Math.floor(Number(req.body[k])))):req.body[k]),Number(req.params.id)); res.json({ok:true});
});
app.delete("/api/admin/materials/:id", requireAdmin, (req,res)=>{db.prepare("DELETE FROM materials WHERE id=?").run(Number(req.params.id));res.json({ok:true});});
app.get("/api/admin/vendors", requireAdmin, (_req,res)=>res.json(db.prepare("SELECT * FROM vendors ORDER BY id DESC").all()));
app.post("/api/admin/vendors", requireAdmin, (req,res)=>{
 const name=clean(req.body.name,120); if(!name)return res.status(400).json({error:"Vendor name is required."});
 const info=db.prepare("INSERT INTO vendors (name,category,location,phone,website,description,approved) VALUES (?,?,?,?,?,?,?)").run(name,clean(req.body.category,80),clean(req.body.location,160),clean(req.body.phone,50),clean(req.body.website,300),clean(req.body.description,500),req.body.approved===true?1:0);
 res.status(201).json({ok:true,id:info.lastInsertRowid});
});
app.patch("/api/admin/vendors/:id", requireAdmin, (req,res)=>{
 const allowed=["name","category","location","phone","website","description","approved"]; const fields=allowed.filter(k=>Object.hasOwn(req.body,k));
 if(!fields.length)return res.status(400).json({error:"No changes supplied."});
 db.prepare(`UPDATE vendors SET ${fields.map(k=>k+"=?").join(",")} WHERE id=?`).run(...fields.map(k=>k==="approved"?(req.body[k]?1:0):req.body[k]),Number(req.params.id));res.json({ok:true});
});
app.delete("/api/admin/vendors/:id", requireAdmin, (req,res)=>{db.prepare("UPDATE materials SET vendor_id=NULL WHERE vendor_id=?").run(Number(req.params.id));db.prepare("DELETE FROM vendors WHERE id=?").run(Number(req.params.id));res.json({ok:true});});

app.post("/api/admin/login", loginLimiter, async (req,res) => {
  const email=clean(req.body.email,160).toLowerCase(), password=String(req.body.password || "");
  const admin=db.prepare("SELECT * FROM admins WHERE email=?").get(email);
  if (!admin || !(await bcrypt.compare(password,admin.password_hash))) return res.status(401).json({ error:"Email or password is incorrect." });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error:"Could not start a secure session." });
    req.session.adminId=admin.id;
    req.session.adminEmail=admin.email;
    req.session.mustChangePassword=!!admin.must_change_password;
    res.json({ ok:true, email:admin.email, mustChangePassword:!!admin.must_change_password });
  });
});
app.post("/api/admin/logout", requireAdmin, (req,res) => req.session.destroy(() => res.json({ok:true})));
app.get("/api/admin/me", requireAdmin, (req,res) => res.json({ email:req.session.adminEmail, mustChangePassword:!!req.session.mustChangePassword }));
app.post("/api/admin/password", requireAdmin, async (req,res) => {
  const current=String(req.body.current_password || ""), next=String(req.body.new_password || "");
  const admin=db.prepare("SELECT * FROM admins WHERE id=?").get(req.session.adminId);
  if (!await bcrypt.compare(current,admin.password_hash)) return res.status(400).json({error:"Current password is incorrect."});
  if (next.length < 10) return res.status(400).json({error:"Use at least 10 characters for your new password."});
  db.prepare("UPDATE admins SET password_hash=?,must_change_password=0 WHERE id=?").run(await bcrypt.hash(next,12),admin.id);
  req.session.mustChangePassword=false;
  res.json({ok:true});
});

app.get("/api/admin/overview", requireAdmin, (_req,res) => {
  const count = (table,where="") => db.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`).get().n;
  res.json({
    enquiries:count("enquiries"), newEnquiries:count("enquiries","WHERE status='New'"),
    bookings:count("bookings"), pendingPayments:count("payments","WHERE status='Pending verification'"), upcoming:db.prepare("SELECT * FROM bookings WHERE event_date >= date('now') ORDER BY event_date LIMIT 6").all(),
    recent:db.prepare("SELECT * FROM enquiries ORDER BY id DESC LIMIT 6").all()
  });
});
app.get("/api/admin/payments", requireAdmin, (_req,res)=>res.json(db.prepare(`SELECT p.*,b.client_name,b.event_type,b.event_date,b.phone,c.name AS account_name,c.email AS customer_email FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN customers c ON c.id=p.customer_id ORDER BY CASE p.status WHEN 'Pending verification' THEN 0 ELSE 1 END,p.id DESC`).all()));
app.patch("/api/admin/payments/:id", requireAdmin, (req,res)=>{
  const status=clean(req.body.status,40), note=clean(req.body.admin_note,500);
  if(!["Confirmed","Rejected"].includes(status)) return res.status(400).json({error:"Choose Confirmed or Rejected."});
  const payment=db.prepare("SELECT id,status FROM payments WHERE id=?").get(Number(req.params.id));
  if(!payment) return res.status(404).json({error:"Payment submission not found."});
  if(payment.status!=="Pending verification") return res.status(409).json({error:"This payment has already been reviewed."});
  db.prepare("UPDATE payments SET status=?,admin_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").run(status,note, payment.id);
  if(status==="Confirmed") {
    const b=db.prepare("SELECT b.id,b.deposit_due,(SELECT COALESCE(SUM(amount_mwk),0) FROM payments WHERE booking_id=b.id AND status='Confirmed') AS paid FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE p.id=?").get(payment.id);
    if(b && (Number(b.deposit_due)<=0 || Number(b.paid)>=Number(b.deposit_due))) db.prepare("UPDATE bookings SET status='Confirmed' WHERE id=? AND status NOT IN ('Cancelled','Completed')").run(b.id);
  }
  res.json({ok:true,status});
});

app.get("/api/admin/availability", requireAdmin, (req,res) => {
  const month=clean(req.query.month,7);
  if(!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({error:"Choose a valid month."});
  const start=`${month}-01`, end=`${month}-31`;
  const bookings=db.prepare("SELECT id,client_name,event_type,event_date,venue,status FROM bookings WHERE event_date>=? AND event_date<=? AND status NOT IN ('Cancelled','Completed') ORDER BY event_date,client_name").all(start,end);
  const overrides=db.prepare("SELECT * FROM availability_overrides WHERE event_date>=? AND event_date<=? ORDER BY event_date").all(start,end);
  const [year,monthNumber]=month.split("-").map(Number);
  const daysInMonth=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  const days=Array.from({length:daysInMonth},(_,i)=>`${month}-${String(i+1).padStart(2,"0")}`).map(d=>({...availabilityForDate(d),events:bookings.filter(x=>x.event_date===d)}));
  return res.json({daily_capacity:Math.max(1,Number(settingsObject().daily_capacity)||1),bookings,overrides,days});
});
app.put("/api/admin/availability/settings", requireAdmin, (req,res) => {
  const capacity=Number(req.body.daily_capacity);
  if(!Number.isInteger(capacity)||capacity<1||capacity>30) return res.status(400).json({error:"Daily capacity must be a whole number from 1 to 30."});
  db.prepare("INSERT INTO settings(key,value) VALUES('daily_capacity',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(capacity));
  res.json({ok:true,daily_capacity:capacity});
});
app.put("/api/admin/availability/:date", requireAdmin, (req,res) => {
  const date=clean(req.params.date,10), unavailable=!!req.body.unavailable;
  if(!validEventDate(date)) return res.status(400).json({error:"Choose a valid date."});
  let capacity=req.body.capacity===undefined || req.body.capacity==="" ? null : Number(req.body.capacity);
  if(capacity!==null && (!Number.isInteger(capacity)||capacity<0||capacity>30)) return res.status(400).json({error:"Date capacity must be between 0 and 30."});
  const note=clean(req.body.note,250);
  db.prepare(`INSERT INTO availability_overrides(event_date,capacity,unavailable,note,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(event_date) DO UPDATE SET capacity=excluded.capacity,unavailable=excluded.unavailable,note=excluded.note,updated_at=CURRENT_TIMESTAMP`).run(date,capacity,unavailable?1:0,note);
  res.json({ok:true,availability:availabilityForDate(date)});
});
app.delete("/api/admin/availability/:date", requireAdmin, (req,res) => {
  const date=clean(req.params.date,10); if(!validEventDate(date)) return res.status(400).json({error:"Choose a valid date."});
  db.prepare("DELETE FROM availability_overrides WHERE event_date=?").run(date); res.json({ok:true,availability:availabilityForDate(date)});
});

const adminTables = {
  enquiries: { table:"enquiries", fields:["name","email","phone","event_type","event_date","venue","guests","budget","details","status"] },
  bookings: { table:"bookings", fields:["client_name","phone","event_type","event_date","venue","status","notes","deposit_due","total_due"] },
  services: { table:"services", fields:["title","description","active","sort_order"] },
  testimonials: { table:"testimonials", fields:["client_name","quote","event_type","active"] }
};
for (const [key,config] of Object.entries(adminTables)) {
  app.get(`/api/admin/${key}`, requireAdmin, (_req,res) => res.json(db.prepare(`SELECT * FROM ${config.table} ORDER BY id DESC`).all()));
  app.post(`/api/admin/${key}`, requireAdmin, (req,res) => {
    const values=config.fields.map(f => (f==="active" ? (req.body[f]===undefined?1:Number(req.body[f])) : (["deposit_due","total_due"].includes(f) ? Math.max(0,Number(req.body[f])||0) : (req.body[f] ?? ""))));
    if (key==="services" && !clean(req.body.title,120)) return res.status(400).json({error:"A service title is required."});
    if (key==="bookings" && (!clean(req.body.client_name,120) || !clean(req.body.event_date,30) || !clean(req.body.event_type,100))) return res.status(400).json({error:"Client, event type and date are required."});
    if (key==="bookings" && !["Cancelled","Completed"].includes(clean(req.body.status,30))) { const capErr=bookingCapacityError(clean(req.body.event_date,10)); if(capErr) return res.status(409).json({error:capErr}); }
    if (key==="bookings" && Number(req.body.deposit_due)>0 && Number(req.body.total_due)>0 && Number(req.body.deposit_due)>Number(req.body.total_due)) return res.status(400).json({error:"The agreed deposit cannot exceed the total quotation."});
    if (key==="testimonials" && (!clean(req.body.client_name,120) || !clean(req.body.quote,1000))) return res.status(400).json({error:"Client name and quote are required."});
    const cols=config.fields.join(","), marks=config.fields.map(()=>"?").join(",");
    const info=db.prepare(`INSERT INTO ${config.table} (${cols}) VALUES (${marks})`).run(...values);
    if (key === "bookings") {
      const linkedCustomer=Number(req.body.customer_id)||null;
      if(linkedCustomer && db.prepare("SELECT id FROM customers WHERE id=?").get(linkedCustomer)) db.prepare("UPDATE bookings SET customer_id=? WHERE id=?").run(linkedCustomer,Number(info.lastInsertRowid));
      else if(clean(req.body.phone,50)) db.prepare("UPDATE bookings SET customer_id=(SELECT id FROM customers WHERE phone=? LIMIT 1) WHERE id=?").run(clean(req.body.phone,50),Number(info.lastInsertRowid));
    }
    res.status(201).json({ok:true,id:info.lastInsertRowid});
  });
  app.patch(`/api/admin/${key}/:id`, requireAdmin, (req,res) => {
    const fields=config.fields.filter(f => Object.prototype.hasOwnProperty.call(req.body,f));
    if (!fields.length) return res.status(400).json({error:"No changes supplied."});
    const values=fields.map(f=>["deposit_due","total_due"].includes(f)?Math.max(0,Number(req.body[f])||0):req.body[f]);
    if(key==="bookings") {
      const existing=db.prepare("SELECT * FROM bookings WHERE id=?").get(Number(req.params.id));
      if(!existing) return res.status(404).json({error:"Booking not found."});
      const nextDate=fields.includes("event_date")?clean(req.body.event_date,10):existing.event_date;
      const nextStatus=fields.includes("status")?clean(req.body.status,30):existing.status;
      if(!validEventDate(nextDate)) return res.status(400).json({error:"Please enter a valid event date."});
      if(!["Cancelled","Completed"].includes(nextStatus)) { const capErr=bookingCapacityError(nextDate,existing.id); if(capErr) return res.status(409).json({error:capErr}); }
    }
    db.prepare(`UPDATE ${config.table} SET ${fields.map(f=>`${f}=?`).join(",")} WHERE id=?`).run(...values,Number(req.params.id));
    res.json({ok:true});
  });
  app.delete(`/api/admin/${key}/:id`, requireAdmin, (req,res) => {
    db.prepare(`DELETE FROM ${config.table} WHERE id=?`).run(Number(req.params.id));
    res.json({ok:true});
  });
}
app.get("/api/admin/portfolio", requireAdmin, (_req,res) => res.json(db.prepare("SELECT * FROM portfolio ORDER BY id DESC").all()));
app.post("/api/admin/portfolio", requireAdmin, upload.single("image"), (req,res) => {
  if (!req.file) return res.status(400).json({error:"Choose an image first."});
  if (!imageSignatureMatches(req.file)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({error:"The uploaded file does not match a supported image format."});
  }
  const title=clean(req.body.title,120);
  if (!title) { fs.unlinkSync(req.file.path); return res.status(400).json({error:"Add a project title."}); }
  const image=`/uploads/${req.file.filename}`;
  const info=db.prepare("INSERT INTO portfolio (title,category,image,description) VALUES (?,?,?,?)")
    .run(title,clean(req.body.category,80)||"Event decor",image,clean(req.body.description,500));
  res.status(201).json({ok:true,id:info.lastInsertRowid});
});
app.delete("/api/admin/portfolio/:id", requireAdmin, (req,res) => {
  const item=db.prepare("SELECT image FROM portfolio WHERE id=?").get(Number(req.params.id));
  if (item) {
    db.prepare("DELETE FROM portfolio WHERE id=?").run(Number(req.params.id));
    const filename=path.basename(item.image);
    const target=path.join(UPLOADS,filename);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
  res.json({ok:true});
});
app.get("/api/admin/settings", requireAdmin, (_req,res) => res.json(settingsObject()));
app.put("/api/admin/settings", requireAdmin, (req,res) => {
  const allowed=["business_name","phone","whatsapp","location","facebook","instagram","business_hours","service_area","tagline","about"];
  for (const key of ["facebook","instagram"]) if (req.body[key] !== undefined && !validPublicUrl(clean(req.body[key],500))) {
    return res.status(400).json({error:`${key} URL must be a valid HTTPS link.`});
  }
  if (req.body.whatsapp !== undefined && clean(req.body.whatsapp,30) && !/^\+?\d{7,15}$/.test(clean(req.body.whatsapp,30))) {
    return res.status(400).json({error:"WhatsApp number must contain 7 to 15 digits, with an optional leading +."});
  }
  const stmt=db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  for (const key of allowed) if (req.body[key] !== undefined) stmt.run(key,clean(req.body[key],2000));
  res.json({ok:true});
});

app.get("/admin", (_req,res) => res.sendFile(path.join(ROOT,"public","admin.html")));
app.get("/planner", (req,res) => { if (!req.session.customerId) return res.redirect("/login?next=/planner"); res.sendFile(path.join(ROOT,"public","planner.html")); });
app.get(["/account", "/login", "/register"], (_req,res) => res.sendFile(path.join(ROOT,"public","account.html")));
app.get("*", (req,res,next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({error:"Not found"});
  res.sendFile(path.join(ROOT,"public","index.html"));
});
app.use((err,_req,res,_next) => {
  console.error(err);
  res.status(400).json({error:err.message || "Something went wrong."});
});
app.listen(PORT, () => console.log(`Emma's Decor Mw website running at http://localhost:${PORT}`));
