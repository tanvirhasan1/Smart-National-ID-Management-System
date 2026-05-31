#!/usr/bin/env node
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const CitigenUser = require('../models/CitigenUser');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const SupportTicket = require('../models/SupportTicket');
const Center = require('../models/Center');
const AuditLog = require('../models/AuditLog');
const AdminPresence = require('../models/AdminPresence');
const { getDefaultPermissions } = require('../utils/roles');

const CFG = {
  password: 'DemoPass123!',
  domain: 'demo.smartnid.local',
  seedTag: 'smartnid-demo-v3',
  appPrefix: 'APP-DEMO-',
  ticketPrefix: 'TKT-DEMO-',
  ipPool: ['103.88.120.14', '103.134.221.38', '45.114.85.27', '116.206.56.19'],
  userAgent: 'Mozilla/5.0 (SmartNID Demo Seed v3)',
  statuses: { draft: 2, submitted: 8, under_review: 8, approved: 9, rejected: 6, printed: 6, delivered: 6, cancelled: 3 }
};
const DRY = process.argv.includes('--dry-run');

const maleFirst = [['Mehedi','মেহেদী'],['Rakibul','রাকিবুল'],['Tanvir','তানভীর'],['Sajid','সাজিদ'],['Nayeem','নাঈম'],['Fahim','ফাহিম'],['Sabbir','সাব্বির'],['Nafis','নাফিস'],['Arafat','আরাফাত'],['Mahin','মাহিন'],['Rafiul','রাফিউল'],['Shahriar','শাহরিয়ার']];
const femaleFirst = [['Nusrat','নুসরাত'],['Farhana','ফারহানা'],['Tanjila','তানজিলা'],['Sharmin','শারমিন'],['Maliha','মালিহা'],['Sadia','সাদিয়া'],['Jannatul','জান্নাতুল'],['Moumita','মৌমিতা'],['Tabassum','তাবাসসুম'],['Sanjida','সানজিদা'],['Ishrat','ইশরাত'],['Raisa','রাইসা']];
const lastNames = [['Hasan','হাসান'],['Islam','ইসলাম'],['Ahmed','আহমেদ'],['Rahman','রহমান'],['Hossain','হোসাইন'],['Chowdhury','চৌধুরী'],['Alam','আলম'],['Karim','করিম'],['Kabir','কবির'],['Sarker','সরকার'],['Mahmud','মাহমুদ'],['Akter','আক্তার'],['Sultana','সুলতানা'],['Noor','নূর']];
const locations = [
  { division:'Dhaka', district:'Dhaka', upazila:'Dhamrai', unionOrWard:'Kulla', villageOrArea:'Islampur', postOffice:'Dhamrai', postalCode:'1350' },
  { division:'Dhaka', district:'Gazipur', upazila:'Sreepur', unionOrWard:'Telihati', villageOrArea:'Mawna', postOffice:'Mawna', postalCode:'1740' },
  { division:'Chattogram', district:'Chattogram', upazila:'Pahartali', unionOrWard:'South Kattali', villageOrArea:'Halishahar Block B', postOffice:'Halishahar', postalCode:'4216' },
  { division:'Chattogram', district:'Cumilla', upazila:'Burichang', unionOrWard:'Bakshimul', villageOrArea:'Sholo Ghar', postOffice:'Burichang', postalCode:'3520' },
  { division:'Rajshahi', district:'Rajshahi', upazila:'Paba', unionOrWard:'Harian', villageOrArea:'Kashiadanga', postOffice:'Rajshahi Sadar', postalCode:'6204' },
  { division:'Khulna', district:'Khulna', upazila:'Dumuria', unionOrWard:'Kharnia', villageOrArea:'Atlia', postOffice:'Dumuria', postalCode:'9251' },
  { division:'Barishal', district:'Barishal', upazila:'Babuganj', unionOrWard:'Rahmatpur', villageOrArea:'Chandpasha', postOffice:'Rahmatpur', postalCode:'8210' },
  { division:'Sylhet', district:'Sylhet', upazila:'Osmani Nagar', unionOrWard:'Tajpur', villageOrArea:'Burunga', postOffice:'Tajpur', postalCode:'3124' },
  { division:'Rangpur', district:'Rangpur', upazila:'Taraganj', unionOrWard:'Sayestanagar', villageOrArea:'Mahiganj', postOffice:'Mahiganj', postalCode:'5404' },
  { division:'Mymensingh', district:'Mymensingh', upazila:'Trishal', unionOrWard:'Bailor', villageOrArea:'Kathal', postOffice:'Trishal', postalCode:'2220' },
  { division:'Dhaka', district:'Narayanganj', upazila:'Sonargaon', unionOrWard:'Pirojpur', villageOrArea:'Mograpara', postOffice:'Mograpara', postalCode:'1440' },
  { division:'Chattogram', district:'Noakhali', upazila:'Begumganj', unionOrWard:'Eklashpur', villageOrArea:'Choumuhani', postOffice:'Choumuhani', postalCode:'3821' }
];
const centersSeed = [
  ['Dhaka Regional Smart NID Center','Dhaka','Level 4, Civic Service Complex, Dhamrai, Dhaka','09678001001',180],
  ['Gazipur Metropolitan Enrollment Center','Gazipur','Mawna Bazar Road, Sreepur, Gazipur','09678001002',140],
  ['Chattogram Port City Smart NID Center','Chattogram','Halishahar Access Road, Pahartali, Chattogram','09678001003',160],
  ['Cumilla District Citizen Service Center','Cumilla','Burichang Main Road, Cumilla','09678001004',120],
  ['Rajshahi Urban Enrollment Center','Rajshahi','Kashiadanga Link Road, Paba, Rajshahi','09678001005',110],
  ['Khulna Divisional NID Support Center','Khulna','Atlia Service Point, Dumuria, Khulna','09678001006',115],
  ['Sylhet Smart Card Service Point','Sylhet','Tajpur Bypass, Osmani Nagar, Sylhet','09678001007',100],
  ['Barishal River View Enrollment Center','Barishal','Rahmatpur Launch Ghat Road, Babuganj, Barishal','09678001008',95]
];
const occupations = ['Teacher','Small Business Owner','Farmer','Accountant','Pharmacist','Tailor','Freelancer','Sales Executive','Service Holder','University Student','Nurse','Electrician'];
const rejectionCases = [
  { docKey:'birthCertificate', reason:'Birth certificate image is blurry and needs a clearer re-upload.' },
  { docKey:'signature', reason:'Signature does not match the applicant name clearly enough.' },
  { docKey:'photograph', reason:'Photograph quality is not acceptable for smart card printing.' }
];

const esc = (v='') => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const pick = (arr, i) => arr[i % arr.length];
const daysAgo = (d=0,h=10) => { const x=new Date(); x.setUTCHours(h,0,0,0); x.setUTCDate(x.getUTCDate()-d); return x; };
const daysFromNow = (d=0,h=10) => { const x=new Date(); x.setUTCHours(h,0,0,0); x.setUTCDate(x.getUTCDate()+d); return x; };
const flatStatuses = () => Object.entries(CFG.statuses).flatMap(([k,n]) => Array(n).fill(k));
const phone = i => `017${String(13000000+i).padStart(8,'0')}`;
const birthReg = i => `${2000+(i%20)}${String(1000000000000+i).slice(-13)}`;
const nid = i => `${String(10000000000000000+i).slice(-17)}`;
const appId = i => `${CFG.appPrefix}${String(i+1).padStart(4,'0')}`;
const ticketNo = i => `${CFG.ticketPrefix}${String(i+1).padStart(4,'0')}`;
const emailFrom = (name,i) => `${name.toLowerCase().replace(/[^a-z]+/g,'.').replace(/^\.|\.$/g,'')}.${i+1}@${CFG.domain}`;
const svgUri = svg => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const escapeRegex = v => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const userAddr = l => ({ division:l.division, district:l.district, upazila:l.upazila, union:l.unionOrWard, village:l.villageOrArea, postCode:l.postalCode });
const appAddr = l => ({ division:l.division, district:l.district, upazila:l.upazila, unionOrWard:l.unionOrWard, villageOrArea:l.villageOrArea, postOffice:l.postOffice, postalCode:l.postalCode });
const banglaName = pair => `${pair[0][1]} ${pair[1][1]}`;
const englishName = pair => `${pair[0][0]} ${pair[1][0]}`;

function makeAvatar(name, i){ const ini=name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase(); const c1=['#0F766E','#1D4ED8','#7C3AED','#BE185D'][i%4]; const c2=['#16A34A','#0891B2','#9333EA','#EA580C'][i%4]; return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="480" height="600" rx="28" fill="url(#g)"/><circle cx="240" cy="200" r="92" fill="rgba(255,255,255,.22)"/><path d="M120 500c18-88 90-132 120-132s102 44 120 132" fill="rgba(255,255,255,.2)"/><text x="240" y="215" font-size="62" text-anchor="middle" fill="#fff" font-family="Arial" font-weight="700">${esc(ini)}</text><text x="240" y="552" font-size="24" text-anchor="middle" fill="#fff" font-family="Arial">${esc(name)}</text></svg>`); }
function makeSignature(name){ return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220"><rect width="100%" height="100%" fill="#fff"/><path d="M36 174H604" stroke="#CBD5E1" stroke-width="3"/><text x="46" y="146" font-size="44" fill="#111827" font-family="cursive">${esc(name)}</text></svg>`); }
function makeCertificate(rec){ return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640"><rect width="100%" height="100%" fill="#F8FAFC"/><rect x="22" y="22" width="856" height="596" rx="18" fill="#fff" stroke="#15803D" stroke-width="4"/><text x="450" y="78" font-size="28" text-anchor="middle" fill="#166534" font-family="Arial" font-weight="700">Government Birth Registration Record</text><text x="70" y="150" font-size="22" font-family="Arial">Name: ${esc(rec.fullName)}</text><text x="70" y="194" font-size="22" font-family="Arial">Bangla Name: ${esc(rec.fullNameBangla)}</text><text x="70" y="238" font-size="22" font-family="Arial">Birth Registration No: ${esc(rec.birthRegNumber)}</text><text x="70" y="282" font-size="22" font-family="Arial">Date of Birth: ${esc(rec.dateOfBirth.toISOString().slice(0,10))}</text><text x="70" y="326" font-size="22" font-family="Arial">Father: ${esc(rec.fatherName)}</text><text x="70" y="370" font-size="22" font-family="Arial">Mother: ${esc(rec.motherName)}</text><text x="70" y="414" font-size="22" font-family="Arial">Place of Birth: ${esc(rec.placeOfBirth)}</text><text x="70" y="458" font-size="22" font-family="Arial">Address: ${esc(rec.presentAddress.villageOrArea)}, ${esc(rec.presentAddress.upazila)}, ${esc(rec.presentAddress.district)}</text><text x="70" y="560" font-size="18" fill="#475569" font-family="Arial">Demo seed certificate for presentation only</text></svg>`); }
function managedDoc({type,dataUri,file,actorId,reviewerId,status,createdAt,reason=''}){
  if(status==='not_uploaded') return { status:'not_uploaded', cloudinary:{}, uploadedAt:null, uploadedBy:null, verifiedAt:null, verifiedBy:null, rejectionReason:'', history:[] };
  const uploadedAt = new Date(createdAt.getTime()+2*60*60*1000), verifiedAt = status==='uploaded' ? null : new Date(createdAt.getTime()+26*60*60*1000);
  const history = [{ action:'uploaded', actor:actorId, actorRole:'citizen', note:`${type} uploaded during demo seeding`, publicId:`demo/${type}/${actorId}`, secureUrl:dataUri, occurredAt:uploadedAt }];
  if(status==='verified') history.push({ action:'verified', actor:reviewerId, actorRole:'admin', note:`${type} verified during review`, publicId:`demo/${type}/${actorId}`, secureUrl:dataUri, occurredAt:verifiedAt });
  if(status==='rejected') history.push({ action:'rejected', actor:reviewerId, actorRole:'admin', note:reason, publicId:`demo/${type}/${actorId}`, secureUrl:dataUri, occurredAt:verifiedAt });
  return { status, cloudinary:{ assetId:`demo-${actorId}-${type}`, publicId:`demo/${type}/${actorId}`, version:1, secureUrl:dataUri, resourceType:'image', format:'png', bytes:dataUri.length, width:type==='signature'?640:type==='birthCertificate'?900:480, height:type==='signature'?220:type==='birthCertificate'?640:600, originalFilename:file, folder:`smartnid/demo/${type}`, etag:`demo-${actorId}-${type}`, createdAt:uploadedAt }, uploadedAt, uploadedBy:actorId, verifiedAt, verifiedBy:status==='uploaded'?null:reviewerId, rejectionReason:status==='rejected'?reason:'', history };
}
function statusHistory({status,createdAt,citizenId,reviewerId,reason}){
  if(status==='draft') return [];
  const s=[{ fromStatus:'draft', toStatus:'submitted', note:'Application submitted by citizen', changedAt:createdAt, changedBy:citizenId, changedByRole:'citizen', ipAddress:CFG.ipPool[0], userAgent:CFG.userAgent, requestId:`submit-${citizenId}` }];
  const reviewAt=new Date(createdAt.getTime()+40*60*60*1000), approveAt=new Date(reviewAt.getTime()+36*60*60*1000), printAt=new Date(approveAt.getTime()+48*60*60*1000), deliverAt=new Date(printAt.getTime()+72*60*60*1000), cancelAt=new Date(createdAt.getTime()+28*60*60*1000);
  if(['under_review','approved','rejected','printed','delivered'].includes(status)) s.push({ fromStatus:'submitted', toStatus:'under_review', note:'Application moved to review queue', changedAt:reviewAt, changedBy:reviewerId, changedByRole:'admin', ipAddress:CFG.ipPool[1], userAgent:CFG.userAgent, requestId:`review-${citizenId}` });
  if(status==='rejected') s.push({ fromStatus:'under_review', toStatus:'rejected', reason, note:reason, changedAt:approveAt, changedBy:reviewerId, changedByRole:'admin', ipAddress:CFG.ipPool[1], userAgent:CFG.userAgent, requestId:`reject-${citizenId}` });
  if(['approved','printed','delivered'].includes(status)) s.push({ fromStatus:'under_review', toStatus:'approved', note:'Application approved after verification', changedAt:approveAt, changedBy:reviewerId, changedByRole:'admin', ipAddress:CFG.ipPool[1], userAgent:CFG.userAgent, requestId:`approve-${citizenId}` });
  if(['printed','delivered'].includes(status)) s.push({ fromStatus:'approved', toStatus:'printed', note:'Smart card queued and printed', changedAt:printAt, changedBy:reviewerId, changedByRole:'admin', ipAddress:CFG.ipPool[2], userAgent:CFG.userAgent, requestId:`print-${citizenId}` });
  if(status==='delivered') s.push({ fromStatus:'printed', toStatus:'delivered', note:'Smart card delivered to applicant', changedAt:deliverAt, changedBy:reviewerId, changedByRole:'admin', ipAddress:CFG.ipPool[2], userAgent:CFG.userAgent, requestId:`deliver-${citizenId}` });
  if(status==='cancelled') s.push({ fromStatus:'submitted', toStatus:'cancelled', note:'Application cancelled by citizen', changedAt:cancelAt, changedBy:citizenId, changedByRole:'citizen', ipAddress:CFG.ipPool[0], userAgent:CFG.userAgent, requestId:`cancel-${citizenId}` });
  return s;
}

function makeCitizen(i){
  const first = i % 2 === 0 ? maleFirst[i % maleFirst.length] : femaleFirst[i % femaleFirst.length];
  const last = lastNames[i % lastNames.length];
  const father = [maleFirst[(i+3)%maleFirst.length], lastNames[(i+2)%lastNames.length]];
  const mother = [femaleFirst[(i+4)%femaleFirst.length], lastNames[(i+5)%lastNames.length]];
  const spouse = i % 3 === 0 ? (i % 2 === 0 ? [femaleFirst[(i+6)%femaleFirst.length], lastNames[(i+7)%lastNames.length]] : [maleFirst[(i+6)%maleFirst.length], lastNames[(i+7)%lastNames.length]]) : null;
  const loc = pick(locations, i), dob = new Date(`${1988+(i%12)}-${String((i%12)+1).padStart(2,'0')}-${String(((i*3)%27)+1).padStart(2,'0')}T00:00:00.000Z`), _id = new mongoose.Types.ObjectId();
  return {
    _id, fullName: englishName([first,last]), fullNameBangla: banglaName([first,last]), birthRegNumber: birthReg(i), dateOfBirth: dob, gender: i%2===0?'male':'female', placeOfBirth: loc.district,
    email: emailFrom(englishName([first,last]), i), phone: phone(i), occupation: pick(occupations,i), maritalStatus: i%3===0?'married':'single', spouseName: spouse?englishName(spouse):'',
    fatherName: englishName(father), motherName: englishName(mother), presentAddress:userAddr(loc), permanentAddress:userAddr(loc), applicationPresentAddress:appAddr(loc), applicationPermanentAddress:appAddr(loc),
    createdAt: daysAgo(30+i), updatedAt: daysAgo(i%7), passwordChangedAt: daysAgo(45+(i%10))
  };
}
function makeInternalUsers(){
  const specs = [
    ['Main Admin','মেইন অ্যাডমিন','main.admin','01790000001','admin','Dhaka','Dhaka','Dhanmondi','Ward 15','Road 27','1209',null,'1989-04-12'],
    ['Anik Sarker','অনিক সরকার','anik.sarker.admin','01790000002','admin','Dhaka','Gazipur','Sreepur','Telihati','Mawna','1740','main','1990-07-21'],
    ['Mahjabin Rahman','মাহজাবিন রহমান','mahjabin.supervisor','01790000003','system_supervisor','Rajshahi','Rajshahi','Paba','Harian','Kashiadanga','6204','main','1992-11-05'],
    ['Nusrat Jahan','নুসরাত জাহান','nusrat.support','01790000004','support_staff','Sylhet','Sylhet','Osmani Nagar','Tajpur','Burunga','3124','main','1993-01-18'],
    ['Fahim Chowdhury','ফাহিম চৌধুরী','fahim.support','01790000005','support_staff','Chattogram','Chattogram','Pahartali','South Kattali','Halishahar Block B','4216','main','1994-03-09']
  ];
  const ids={};
  const users = specs.map((s,i)=>{ const _id=new mongoose.Types.ObjectId(); if(i===0) ids.mainAdminId=_id; if(i===1) ids.adminTwoId=_id; if(i===2) ids.supervisorId=_id; if(i===3) ids.supportOneId=_id; if(i===4) ids.supportTwoId=_id; return { _id, fullName:s[0], fullNameBangla:s[1], birthRegNumber:`199${9-i}0000000000000${i+1}`, dateOfBirth:new Date(`${s[12]}T00:00:00.000Z`), gender:i===2||i===3?'female':'male', placeOfBirth:s[5], email:`${s[2]}@${CFG.domain}`, phone:s[3], role:s[4], permissions:s[4]==='admin'?['*']:getDefaultPermissions(s[4]), isVerified:true, status:'active', presentAddress:{ division:s[5], district:s[6], upazila:s[7], union:s[8], village:s[9], postCode:s[10] }, permanentAddress:{ division:s[5], district:s[6], upazila:s[7], union:s[8], village:s[9], postCode:s[10] }, createdBy:s[11]==='main'?ids.mainAdminId:null, passwordChangedAt:daysAgo(45-i*3), createdAt:daysAgo(120-i*8), updatedAt:daysAgo(1), isArchived:false, archivedAt:null, archivedBy:null, archiveReason:'' }; });
  users.slice(1).forEach(u=>{ if(!u.createdBy) u.createdBy=ids.mainAdminId; });
  return { users, ids };
}

function birthCertificateRecords(citizens){
  const linked = citizens.map(c=>({ _id:new mongoose.Types.ObjectId(), fullName:c.fullName, fullNameBangla:c.fullNameBangla, birthRegNumber:c.birthRegNumber, birthRegistrationNumber:c.birthRegNumber, dateOfBirth:c.dateOfBirth, gender:c.gender, placeOfBirth:c.placeOfBirth, fatherName:c.fatherName, motherName:c.motherName, presentAddress:c.applicationPresentAddress, permanentAddress:c.applicationPermanentAddress, seedTag:CFG.seedTag, linkedUserId:c._id, isPublicRegistrationOnly:false, createdAt:c.createdAt, updatedAt:c.updatedAt }));
  const extra = Array.from({length:8}).map((_,i)=>{ const a=i%2===0?maleFirst[(i+2)%maleFirst.length]:femaleFirst[(i+2)%femaleFirst.length], b=lastNames[(i+3)%lastNames.length], loc=pick(locations,i+2), dob=new Date(`${1996+i}-0${(i%8)+1}-1${i%9}T00:00:00.000Z`); return { _id:new mongoose.Types.ObjectId(), fullName:englishName([a,b]), fullNameBangla:banglaName([a,b]), birthRegNumber:`REGPUBLIC${String(7100000000+i)}`, birthRegistrationNumber:`REGPUBLIC${String(7100000000+i)}`, dateOfBirth:dob, gender:i%2===0?'male':'female', placeOfBirth:loc.district, fatherName:englishName([maleFirst[(i+4)%maleFirst.length], lastNames[(i+5)%lastNames.length]]), motherName:englishName([femaleFirst[(i+4)%femaleFirst.length], lastNames[(i+6)%lastNames.length]]), presentAddress:appAddr(loc), permanentAddress:appAddr(loc), seedTag:CFG.seedTag, isPublicRegistrationOnly:true, createdAt:daysAgo(180-i), updatedAt:daysAgo(180-i) }; });
  return [...linked, ...extra];
}
function applications(citizens, ids){
  const statuses = flatStatuses();
  return citizens.map((c,i)=>{ const status=statuses[i], createdAt=daysAgo(22+i*2), reviewerId=i%2===0?ids.mainAdminId:ids.adminTwoId, rej=status==='rejected'?pick(rejectionCases,i):null, hist=statusHistory({status,createdAt,citizenId:c._id,reviewerId,reason:rej?.reason||''}), avatar=makeAvatar(c.fullName,i), sign=makeSignature(c.fullName), cert=makeCertificate(c), phot=status==='draft'?'not_uploaded':rej?.docKey==='photograph'?'rejected':'verified', sig=status==='draft'?'not_uploaded':rej?.docKey==='signature'?'rejected':'verified', bir=status==='draft'?'not_uploaded':rej?.docKey==='birthCertificate'?'rejected':'verified', sub=hist.find(x=>x.toStatus==='submitted'), app=hist.find(x=>x.toStatus==='approved'), pri=hist.find(x=>x.toStatus==='printed'), del=hist.find(x=>x.toStatus==='delivered'), can=hist.find(x=>x.toStatus==='cancelled'); return { _id:new mongoose.Types.ObjectId(), applicant:c._id, applicationId:appId(i), applicationType:'new', fullNameEnglish:c.fullName, fullNameBangla:c.fullNameBangla, fatherName:c.fatherName, motherName:c.motherName, spouseName:c.spouseName, dateOfBirth:c.dateOfBirth, gender:c.gender, bloodGroup:pick(['A+','A-','B+','B-','AB+','AB-','O+','O-'],i), maritalStatus:c.maritalStatus, birthRegistrationNumber:c.birthRegNumber, existingNidNumber:['approved','printed','delivered'].includes(status)?nid(9000+i):'', phone:c.phone, email:c.email, occupation:c.occupation, presentAddress:c.applicationPresentAddress, permanentAddress:c.applicationPermanentAddress, documents:{ birthCertificate:status==='draft'?'':cert, fatherNid:nid(300+i), motherNid:nid(600+i), utilityBill:`UB-${String(i+1).padStart(4,'0')}`, passport:i%5===0?`BDP${String(5000000+i).slice(-7)}`:'', photo:status==='draft'?'':avatar, signature:status==='draft'?'':sign }, documentAssets:{ photograph:managedDoc({type:'photograph',dataUri:avatar,file:`photo-${i+1}.png`,actorId:c._id,reviewerId,status:phot,createdAt,reason:rej?.docKey==='photograph'?rej.reason:''}), signature:managedDoc({type:'signature',dataUri:sign,file:`signature-${i+1}.png`,actorId:c._id,reviewerId,status:sig,createdAt,reason:rej?.docKey==='signature'?rej.reason:''}), birthCertificate:managedDoc({type:'birthCertificate',dataUri:cert,file:`birth-certificate-${i+1}.png`,actorId:c._id,reviewerId,status:bir,createdAt,reason:rej?.docKey==='birthCertificate'?rej.reason:''}) }, status, statusHistory:hist, rejectionReason:rej?.reason||'', submittedAt:sub?.changedAt||null, approvedAt:app?.changedAt||null, printedAt:pri?.changedAt||null, dispatchedAt:null, deliveredAt:del?.changedAt||null, cancelledAt:can?.changedAt||null, latestStatusChangedAt:hist.length?hist[hist.length-1].changedAt:createdAt, createdAt, updatedAt:hist.length?hist[hist.length-1].changedAt:createdAt }; });
}
function centers(){ return centersSeed.map((c,i)=>({ _id:new mongoose.Types.ObjectId(), name:c[0], district:c[1], address:c[2], contactNumber:c[3], officeHours:'Sun-Thu 9:00 AM - 4:00 PM', dailyCapacity:c[4], isActive:true, createdAt:daysAgo(90-i*4), updatedAt:daysAgo(5+(i%3)) })); }
function appointments(apps,citizens,cts){ const out=[]; const approved=apps.filter(x=>x.status==='approved'), printed=apps.filter(x=>x.status==='printed'), delivered=apps.filter(x=>x.status==='delivered'); approved.slice(0,7).forEach((a,i)=>{ const c=citizens.find(x=>String(x._id)===String(a.applicant)), ctr=cts.find(x=>x.district===a.presentAddress.district)||pick(cts,i); out.push({ _id:new mongoose.Types.ObjectId(), application:a._id, applicant:c._id, appointmentDate:daysFromNow(i+2), timeSlot:pick(['10:00 AM - 10:30 AM','11:30 AM - 12:00 PM','2:00 PM - 2:30 PM'],i), centerName:ctr.name, centerDistrict:ctr.district, notes:'Bring original birth registration certificate, mobile number used during application, and keep 15 minutes in hand before slot time.', status:i===6?'cancelled':'booked', bookedAt:daysAgo(1+i), createdAt:daysAgo(1+i), updatedAt:daysAgo(i) }); }); printed.slice(0,5).forEach((a,i)=>{ const c=citizens.find(x=>String(x._id)===String(a.applicant)), ctr=cts.find(x=>x.district===a.presentAddress.district)||pick(cts,i+2); out.push({ _id:new mongoose.Types.ObjectId(), application:a._id, applicant:c._id, appointmentDate:daysAgo(12+i), timeSlot:pick(['9:30 AM - 10:00 AM','11:00 AM - 11:30 AM'],i), centerName:ctr.name, centerDistrict:ctr.district, notes:'Biometric enrollment completed successfully and the record moved to smart card production.', status:'completed', bookedAt:daysAgo(16+i), createdAt:daysAgo(16+i), updatedAt:daysAgo(11+i) }); }); delivered.slice(0,6).forEach((a,i)=>{ const c=citizens.find(x=>String(x._id)===String(a.applicant)), ctr=cts.find(x=>x.district===a.presentAddress.district)||pick(cts,i+4); out.push({ _id:new mongoose.Types.ObjectId(), application:a._id, applicant:c._id, appointmentDate:daysAgo(24+i), timeSlot:pick(['10:30 AM - 11:00 AM','1:00 PM - 1:30 PM'],i), centerName:ctr.name, centerDistrict:ctr.district, notes:'Appointment completed, biometrics verified, and the smart card has already been delivered.', status:'completed', bookedAt:daysAgo(28+i), createdAt:daysAgo(28+i), updatedAt:daysAgo(23+i) }); }); return out; }
function tickets(citizens, ids){ const ass=[ids.mainAdminId, ids.supportOneId, ids.supportTwoId], st=['open','in_progress','resolved','closed'], subs=['Application status taking longer than expected','Unable to understand appointment instructions','Photo upload did not show correctly in review','Need help with delivery timeline','Birth registration verification question','Technical issue while opening tracker','Support needed for document rejection note','Appointment reschedule clarification'], desc=['I submitted my application and the status has not changed for several days.','The appointment instructions are not fully clear for my case.','After uploading the photograph, I was not sure whether the preview was accepted correctly.','I need a clearer idea of card delivery timing.','My birth registration number was accepted but I want to verify any additional supporting paper.','The tracker page worked slowly on mobile and I need help understanding whether my application was updated.','The rejection note was short and I want to understand exactly which file I should upload again.','I want confirmation about appointment slot availability before I attend in person.']; const lib={ open:[], in_progress:['We are checking the relevant application and center data.','Please keep your registered mobile number active for any further communication.'], resolved:['We verified the issue and shared the exact next steps.','No additional action is required from you at this moment.'], closed:['The matter was resolved previously and the ticket is now closed.','You can open a new ticket anytime if a new issue appears.'] }; return citizens.slice(0,16).map((c,i)=>{ const status=st[i%4], assigned=status==='open'&&i%2===0?null:ass[i%ass.length], createdAt=daysAgo(2+i*2), responses=[]; if(status!=='open') responses.push({ message:'Support team received the ticket and started internal verification.', responder:assigned||ids.supportOneId, responderRole:'support_staff', createdAt:new Date(createdAt.getTime()+8*60*60*1000) }); lib[status].forEach((m,ix)=>responses.push({ message:m, responder:assigned||ids.supportOneId, responderRole:ix===0?'support_staff':'admin', createdAt:new Date(createdAt.getTime()+(24+ix*18)*60*60*1000) })); if(['resolved','closed'].includes(status)) responses.push({ message:'Thank you. The explanation is clear and I have understood the next steps.', responder:c._id, responderRole:'citizen', createdAt:new Date(createdAt.getTime()+70*60*60*1000) }); return { _id:new mongoose.Types.ObjectId(), citizen:c._id, ticketNumber:ticketNo(i), subject:pick(subs,i), category:pick(['application_issue','appointment','payment','delivery','technical','other'],i), priority:pick(['low','medium','high','urgent'],i), description:pick(desc,i), status, assignedTo:assigned, resolutionNotes:['resolved','closed'].includes(status)?'Issue reviewed and demo-ready explanation shared with applicant.':'', responses, resolvedAt:['resolved','closed'].includes(status)?new Date(createdAt.getTime()+60*60*60*1000):null, closedAt:status==='closed'?new Date(createdAt.getTime()+84*60*60*1000):null, createdAt, updatedAt:status==='open'?createdAt:new Date(createdAt.getTime()+84*60*60*1000) }; }); }
function userBuckets(users){ const admin=[], citizen=[]; users.forEach(u=>{ if(['admin','system_supervisor','support_staff'].includes(u.role)) admin.push({ _id:new mongoose.Types.ObjectId(), userId:u._id, fullName:u.fullName, email:u.email, phone:u.phone, role:u.role, permissions:u.permissions, status:u.status, isVerified:u.isVerified, createdAt:u.createdAt, updatedAt:u.updatedAt }); else citizen.push({ _id:new mongoose.Types.ObjectId(), userId:u._id, fullName:u.fullName, fullNameBangla:u.fullNameBangla, email:u.email, phone:u.phone, birthRegNumber:u.birthRegNumber, status:u.status, isVerified:u.isVerified, createdAt:u.createdAt, updatedAt:u.updatedAt }); }); return { admin, citizen }; }
function presence(internal){ return internal.map((u,i)=>({ _id:new mongoose.Types.ObjectId(), userId:u._id, role:u.role, isOnline:i<3, sessionStartedAt:i<3?daysAgo(0,3+i):null, lastSeenAt:i<3?daysAgo(0,i+1):daysAgo(1+i), currentRoute:i===0?'/admin/dashboard':i===1?'/admin/applications':i===2?'/admin/support':'/admin/login', ipAddress:CFG.ipPool[i%CFG.ipPool.length], userAgent:CFG.userAgent, lastActiveSource:'request', createdAt:u.createdAt, updatedAt:u.updatedAt })); }
function auditLogs({internal,apps,appts,tks,cts,citizens}){ const logs=[], main=internal[0], support=internal[3], roleByUserId=new Map(internal.map(u=>[String(u._id), u.role])); internal.forEach((u,i)=>logs.push({ _id:new mongoose.Types.ObjectId(), actor:main._id, actorRole:'admin', action:'CREATE_INTERNAL_USER', entityType:'User', entityId:u._id, message:`Created internal user ${u.fullName}`, reason:i===0?'Initial admin bootstrap':'Demo staffing bootstrap', severity:'info', sourceModule:'admin-users', requestId:`demo-user-${i+1}`, ipAddress:CFG.ipPool[0], userAgent:CFG.userAgent, beforeState:null, afterState:{role:u.role,status:u.status}, changedFields:['role','status'], meta:{seeded:true,seedTag:CFG.seedTag}, createdAt:u.createdAt, updatedAt:u.createdAt })); cts.forEach((c,i)=>logs.push({ _id:new mongoose.Types.ObjectId(), actor:main._id, actorRole:'admin', action:'CENTER_CREATED', entityType:'Center', entityId:c._id, message:`Seeded service center ${c.name}`, reason:'Presentation environment setup', severity:'info', sourceModule:'centers', requestId:`demo-center-${i+1}`, ipAddress:CFG.ipPool[0], userAgent:CFG.userAgent, beforeState:null, afterState:{district:c.district,isActive:c.isActive}, changedFields:['district','isActive'], meta:{seeded:true,seedTag:CFG.seedTag}, createdAt:c.createdAt, updatedAt:c.createdAt })); apps.forEach(a=>{ const c=citizens.find(x=>String(x._id)===String(a.applicant)); logs.push({ _id:new mongoose.Types.ObjectId(), actor:c._id, actorRole:'citizen', action:'APPLICATION_CREATED', entityType:'Application', entityId:a._id, message:`Citizen submitted application ${a.applicationId}`, reason:'Demo application submission', severity:'info', sourceModule:'applications', requestId:`demo-app-submit-${a.applicationId}`, ipAddress:CFG.ipPool[0], userAgent:CFG.userAgent, beforeState:null, afterState:{status:a.status,applicationType:a.applicationType}, changedFields:['status'], meta:{seeded:true,seedTag:CFG.seedTag}, createdAt:a.submittedAt||a.createdAt, updatedAt:a.submittedAt||a.createdAt }); a.statusHistory.filter(h=>h.toStatus!=='submitted').forEach((h,j)=>logs.push({ _id:new mongoose.Types.ObjectId(), actor:h.changedBy||main._id, actorRole:h.changedByRole==='citizen'?'citizen':'admin', action:`APPLICATION_${h.toStatus.toUpperCase()}`, entityType:'Application', entityId:a._id, message:`Application ${a.applicationId} moved to ${h.toStatus}`, reason:h.reason||h.note||'', severity:['rejected','cancelled'].includes(h.toStatus)?'warning':'info', sourceModule:'applications', requestId:h.requestId||`demo-history-${a.applicationId}-${j}`, ipAddress:h.ipAddress||CFG.ipPool[1], userAgent:h.userAgent||CFG.userAgent, beforeState:{status:h.fromStatus||'draft'}, afterState:{status:h.toStatus}, changedFields:['status'], meta:{seeded:true,seedTag:CFG.seedTag}, createdAt:h.changedAt, updatedAt:h.changedAt })); }); appts.forEach((a,i)=>logs.push({ _id:new mongoose.Types.ObjectId(), actor:a.status==='booked'?a.applicant:main._id, actorRole:a.status==='booked'?'citizen':'admin', action:`APPOINTMENT_${a.status.toUpperCase()}`, entityType:'Appointment', entityId:a._id, message:`Appointment at ${a.centerName} is ${a.status}`, reason:a.notes, severity:a.status==='cancelled'?'warning':'info', sourceModule:'appointments', requestId:`demo-appointment-${i+1}`, ipAddress:CFG.ipPool[i%CFG.ipPool.length], userAgent:CFG.userAgent, beforeState:null, afterState:{status:a.status,centerName:a.centerName}, changedFields:['status','centerName'], meta:{seeded:true,seedTag:CFG.seedTag}, createdAt:a.updatedAt, updatedAt:a.updatedAt })); tks.forEach((t,i)=>{ const actorId=t.assignedTo||support._id; const actorRole=roleByUserId.get(String(actorId))||'support_staff'; logs.push({ _id:new mongoose.Types.ObjectId(), actor:actorId, actorRole, action:`SUPPORT_${t.status.toUpperCase()}`, entityType:'SupportTicket', entityId:t._id, message:`Support ticket ${t.ticketNumber} is ${t.status}`, reason:t.subject, severity:t.priority==='urgent'?'critical':'info', sourceModule:'support', requestId:`demo-ticket-${i+1}`, ipAddress:CFG.ipPool[i%CFG.ipPool.length], userAgent:CFG.userAgent, beforeState:null, afterState:{status:t.status,priority:t.priority}, changedFields:['status','priority'], meta:{seeded:true,seedTag:CFG.seedTag}, createdAt:t.updatedAt, updatedAt:t.updatedAt }); }); return logs; }

async function cleanup(){
  const domainRegex = new RegExp(`@${escapeRegex(CFG.domain)}$`);
  const demoUsers = await User.find({ email: domainRegex }).select('_id birthRegNumber');
  const userIds = demoUsers.map(x=>x._id), birthRegs = demoUsers.map(x=>x.birthRegNumber).filter(Boolean);
  const demoApps = await Application.find({ applicationId:new RegExp(`^${CFG.appPrefix}`) }).select('_id');
  const demoTickets = await SupportTicket.find({ ticketNumber:new RegExp(`^${CFG.ticketPrefix}`) }).select('_id');
  const demoCenters = await Center.find({ contactNumber:/^0967800100/ }).select('_id');
  const appIds = demoApps.map(x=>x._id), ticketIds=demoTickets.map(x=>x._id), centerIds=demoCenters.map(x=>x._id), bc = mongoose.connection.db.collection('birthcertificates');
  const oldBc = await bc.countDocuments({ seedTag:CFG.seedTag });
  await Promise.all([
    Appointment.deleteMany({ $or:[{ applicant:{ $in:userIds } },{ application:{ $in:appIds } }] }),
    Application.deleteMany({ _id:{ $in:appIds } }),
    SupportTicket.deleteMany({ _id:{ $in:ticketIds } }),
    AuditLog.deleteMany({ $or:[{ actor:{ $in:userIds } },{ entityId:{ $in:[...userIds,...appIds,...ticketIds,...centerIds] } },{ 'meta.seedTag':CFG.seedTag }] }),
    AdminPresence.deleteMany({ userId:{ $in:userIds } }), AdminUser.deleteMany({ userId:{ $in:userIds } }), CitigenUser.deleteMany({ userId:{ $in:userIds } }), User.deleteMany({ _id:{ $in:userIds } }), Center.deleteMany({ _id:{ $in:centerIds } }),
    bc.deleteMany({ $or:[{ seedTag:CFG.seedTag },{ linkedUserId:{ $in:userIds } },{ birthRegNumber:{ $in:birthRegs } }] })
  ]);
  return { users:userIds.length, apps:appIds.length, tickets:ticketIds.length, centers:centerIds.length, birthCertificates:oldBc };
}

async function payload(){
  const { users:internal, ids } = makeInternalUsers();
  const citizens = Array.from({length:48},(_,i)=>makeCitizen(i));
  const hash = await bcrypt.hash(CFG.password,10);
  const users = [...internal, ...citizens].map(u=>({ _id:u._id, fullName:u.fullName, fullNameBangla:u.fullNameBangla, birthRegNumber:u.birthRegNumber, dateOfBirth:u.dateOfBirth, gender:u.gender, placeOfBirth:u.placeOfBirth, email:u.email, phone:u.phone, password:hash, role:u.role||'citizen', permissions:u.permissions||getDefaultPermissions('citizen'), isVerified:true, status:'active', presentAddress:u.presentAddress, permanentAddress:u.permanentAddress, createdBy:u.createdBy||null, passwordChangedAt:u.passwordChangedAt, createdAt:u.createdAt, updatedAt:u.updatedAt, isArchived:false, archivedAt:null, archivedBy:null, archiveReason:'' }));
  const cts = centers(), apps = applications(citizens, ids), appts = appointments(apps, citizens, cts), tks = tickets(citizens, ids), bcs = birthCertificateRecords(citizens), buckets = userBuckets(users), pres = presence(internal), audits = auditLogs({ internal, apps, appts, tks, cts, citizens });
  return { users, bcs, cts, apps, appts, tks, adminBuckets:buckets.admin, citizenBuckets:buckets.citizen, pres, audits };
}

async function insertAll(p){
  await User.collection.insertMany(p.users, { ordered:true });
  await AdminUser.collection.insertMany(p.adminBuckets, { ordered:true });
  await CitigenUser.collection.insertMany(p.citizenBuckets, { ordered:true });
  await Center.collection.insertMany(p.cts, { ordered:true });
  await mongoose.connection.db.collection('birthcertificates').insertMany(p.bcs, { ordered:true });
  await Application.collection.insertMany(p.apps, { ordered:true });
  await Appointment.collection.insertMany(p.appts, { ordered:true });
  await SupportTicket.collection.insertMany(p.tks, { ordered:true });
  await AdminPresence.collection.insertMany(p.pres, { ordered:true });
  await AuditLog.collection.insertMany(p.audits, { ordered:true });
}

(async function main(){
  if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in backend/.env');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const p = await payload();
    const old = await cleanup();
    console.log('=== SmartNID Demo Seed ===');
    console.log('Cleanup:', old);
    console.log('Users:', p.users.length, 'BirthCertificates:', p.bcs.length, 'Applications:', p.apps.length, 'Appointments:', p.appts.length, 'SupportTickets:', p.tks.length, 'Centers:', p.cts.length, 'AuditLogs:', p.audits.length);
    console.log('Application status mix:', CFG.statuses);
    console.log('All demo passwords:', CFG.password);
    console.log('Main admin:', `main.admin@${CFG.domain}`);
    if(DRY){ console.log('Dry run only. No insert executed.'); return; }
    await insertAll(p);
    console.log('Seed completed successfully.');
  } finally { await mongoose.disconnect(); }
})().catch(err => { console.error('Seed failed:', err); process.exitCode = 1; });