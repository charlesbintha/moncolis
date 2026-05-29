/**
 * ColiSN — Script de seed (données de démonstration)
 * Insère 15+ lignes réalistes par table avec des données sénégalaises
 */
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({ connectionString: 'postgresql://eteral:root@localhost:5432/colisn' });

const now = () => new Date().toISOString();
const past = (days) => new Date(Date.now() - days * 86400000).toISOString();
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const uid = () => randomUUID();

// ── Données sénégalaises réalistes ────────────────────────────────
const PRENOMS = ['Mamadou','Fatou','Ousmane','Aissatou','Ibrahima','Mariama','Abdoulaye','Rokhaya','Modou','Aminata','Cheikh','Ndéye','Souleymane','Khady','Boubacar','Maguette','Binta','Pape','Astou','Daouda','Seynabou','Lamine','Coumba','Malick','Awa'];
const NOMS   = ['Diallo','Sall','Ba','Ndiaye','Fall','Diop','Sarr','Mbaye','Thiaw','Badji','Diédhiou','Faye','Kane','Cissé','Kouyaté','Gueye','Sy','Diouf','Coulibaly','Traoré'];
const VILLES = ['Dakar','Thiès','Saint-Louis','Ziguinchor','Kaolack','Mbour','Touba','Tambacounda','Kolda','Louga','Diourbel','Fatick','Sédhiou','Kédougou','Matam'];
const VEHICULES = ['CAR','CAR','CAR','MOTORCYCLE','BUS','MINIBUS','TRUCK','OTHER'];
const OPERATEURS = ['77','78','76','75','70'];

function genPhone(i) {
  const op = OPERATEURS[i % OPERATEURS.length];
  const num = String(1000000 + i * 137 + 31337).substring(0, 7);
  return '+221' + op + num;
}
function genName(i) {
  return PRENOMS[i % PRENOMS.length] + ' ' + NOMS[(i * 3) % NOMS.length];
}
function genEmail(name, i) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'.') + i + '@example.sn';
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🌱 Démarrage du seed ColiSN...\n');

    // ── TRUNCATE (ordre inverse des FK) ──────────────────────────
    console.log('🗑  Nettoyage des tables existantes...');
    await client.query(`
      TRUNCATE TABLE notifications, disputes, reviews, payments, bookings,
        parcel_requests, trips, otp_codes, refresh_tokens, users
      RESTART IDENTITY CASCADE
    `);

    // ═══════════════════════════════════════
    //  1. USERS (20 utilisateurs)
    // ═══════════════════════════════════════
    console.log('👥 Insertion des utilisateurs...');
    const userIds = [];
    const carrierIds = [];
    const senderIds = [];
    const adminId = uid();

    const usersData = [
      // 1 admin
      { id: adminId, role: 'ADMIN', name: 'Admin ColiSN', phone: '+221700000001' },
      // 6 transporteurs
      { role: 'CARRIER' }, { role: 'CARRIER' }, { role: 'CARRIER' },
      { role: 'CARRIER' }, { role: 'CARRIER' }, { role: 'CARRIER' },
      // 6 expéditeurs
      { role: 'SENDER' }, { role: 'SENDER' }, { role: 'SENDER' },
      { role: 'SENDER' }, { role: 'SENDER' }, { role: 'SENDER' },
      // 7 les deux
      { role: 'BOTH' }, { role: 'BOTH' }, { role: 'BOTH' },
      { role: 'BOTH' }, { role: 'BOTH' }, { role: 'BOTH' }, { role: 'BOTH' },
    ];

    for (let i = 0; i < usersData.length; i++) {
      const u = usersData[i];
      const id = u.id || uid();
      const name = u.name || genName(i + 10);
      const phone = u.phone || genPhone(i + 100);
      const email = genEmail(name, i);
      const rating = (3.5 + Math.random() * 1.5).toFixed(1);
      const cniVerified = Math.random() > 0.3;
      const isBanned = Math.random() < 0.05;
      const totalTrips = randInt(0, 45);
      const totalParcels = randInt(0, 30);

      await client.query(`
        INSERT INTO users (id, phone, email, "fullName", role, rating, "ratingCount",
          "totalTrips", "totalParcels", "cniVerified", "isActive", "isBanned",
          "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [id, phone, email, name, u.role, parseFloat(rating), randInt(1, 50),
          totalTrips, totalParcels, cniVerified, !isBanned, isBanned,
          past(randInt(30, 365)), past(randInt(0, 30))]);

      userIds.push(id);
      if (u.role === 'CARRIER' || u.role === 'BOTH') carrierIds.push(id);
      if (u.role === 'SENDER' || u.role === 'BOTH') senderIds.push(id);
    }
    // Les BOTH peuvent être expéditeurs aussi
    console.log(`  ✅ ${usersData.length} utilisateurs créés`);

    // ═══════════════════════════════════════
    //  2. TRIPS (18 trajets)
    // ═══════════════════════════════════════
    console.log('🚗 Insertion des trajets...');
    const tripIds = [];
    const tripsData = [
      // Trajets actifs (futurs)
      { from:'Dakar', to:'Thiès',       dep:future(2),  kg:50, price:500,  status:'ACTIVE',    v:'CAR' },
      { from:'Dakar', to:'Saint-Louis', dep:future(3),  kg:80, price:450,  status:'ACTIVE',    v:'MINIBUS' },
      { from:'Dakar', to:'Ziguinchor',  dep:future(5),  kg:100,price:600,  status:'ACTIVE',    v:'BUS' },
      { from:'Thiès', to:'Kaolack',     dep:future(1),  kg:40, price:400,  status:'ACTIVE',    v:'CAR' },
      { from:'Dakar', to:'Touba',       dep:future(4),  kg:60, price:350,  status:'ACTIVE',    v:'CAR' },
      { from:'Kaolack',to:'Tambacounda',dep:future(6),  kg:120,price:550,  status:'ACTIVE',    v:'TRUCK' },
      { from:'Dakar', to:'Mbour',       dep:future(1),  kg:30, price:300,  status:'ACTIVE',    v:'CAR' },
      { from:'Dakar', to:'Kolda',       dep:future(7),  kg:90, price:700,  status:'ACTIVE',    v:'BUS' },
      // Trajets complets
      { from:'Dakar', to:'Louga',       dep:future(2),  kg:40, price:400,  status:'FULL',      v:'CAR' },
      { from:'Saint-Louis',to:'Dakar',  dep:past(1),    kg:50, price:450,  status:'FULL',      v:'MINIBUS' },
      // Trajets terminés
      { from:'Dakar', to:'Diourbel',    dep:past(10),   kg:60, price:380,  status:'COMPLETED', v:'CAR' },
      { from:'Thiès', to:'Dakar',       dep:past(15),   kg:80, price:420,  status:'COMPLETED', v:'CAR' },
      { from:'Dakar', to:'Fatick',      dep:past(20),   kg:50, price:350,  status:'COMPLETED', v:'MOTORCYCLE' },
      { from:'Kaolack',to:'Dakar',      dep:past(25),   kg:100,price:500,  status:'COMPLETED', v:'MINIBUS' },
      { from:'Dakar', to:'Sédhiou',     dep:past(30),   kg:70, price:650,  status:'COMPLETED', v:'BUS' },
      { from:'Ziguinchor',to:'Dakar',   dep:past(12),   kg:90, price:700,  status:'COMPLETED', v:'BUS' },
      // Annulés
      { from:'Dakar', to:'Kédougou',    dep:past(5),    kg:80, price:800,  status:'CANCELLED', v:'TRUCK' },
      { from:'Louga', to:'Touba',       dep:past(8),    kg:40, price:300,  status:'CANCELLED', v:'CAR' },
    ];

    for (let i = 0; i < tripsData.length; i++) {
      const t = tripsData[i];
      const id = uid();
      const carrierId = carrierIds[i % carrierIds.length];
      const bookedKg = t.status === 'FULL' ? t.kg : t.status === 'COMPLETED' ? t.kg * 0.8 : randInt(0, Math.floor(t.kg * 0.6));

      await client.query(`
        INSERT INTO trips (id, "carrierId", "originCity", "destinationCity", "departureDate",
          "availableKg", "bookedKg", "pricePerKg", "vehicleType", status,
          "originDetail", "destinationDetail", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [id, carrierId, t.from, t.to, t.dep, t.kg, bookedKg, t.price, t.v, t.status,
          'Gare routière de ' + t.from, 'Centre-ville de ' + t.to,
          past(randInt(40, 60)), past(randInt(0, 10))]);

      tripIds.push({ id, from: t.from, to: t.to, status: t.status, price: t.price });
    }
    console.log(`  ✅ ${tripsData.length} trajets créés`);

    // ═══════════════════════════════════════
    //  3. PARCEL REQUESTS (18 demandes)
    // ═══════════════════════════════════════
    console.log('📦 Insertion des demandes de colis...');
    const parcelIds = [];
    const parcelRoutes = [
      { from:'Dakar',to:'Thiès'},     { from:'Dakar',to:'Saint-Louis'},
      { from:'Dakar',to:'Ziguinchor'},{ from:'Thiès',to:'Kaolack'},
      { from:'Dakar',to:'Touba'},     { from:'Kaolack',to:'Tambacounda'},
      { from:'Dakar',to:'Mbour'},     { from:'Dakar',to:'Kolda'},
      { from:'Dakar',to:'Louga'},     { from:'Saint-Louis',to:'Dakar'},
      { from:'Dakar',to:'Diourbel'},  { from:'Thiès',to:'Dakar'},
      { from:'Dakar',to:'Fatick'},    { from:'Kaolack',to:'Dakar'},
      { from:'Dakar',to:'Sédhiou'},   { from:'Ziguinchor',to:'Dakar'},
      { from:'Dakar',to:'Kédougou'},  { from:'Louga',to:'Touba'},
    ];
    const descriptions = [
      'Vêtements et textiles', 'Électronique (téléphones)', 'Médicaments et pharmacie',
      'Livres et documents', 'Chaussures', 'Cosmétiques et beauté',
      'Pièces automobiles', 'Matériel informatique', 'Cadeaux familiaux',
      'Alimentation sèche', 'Artisanat sénégalais', 'Matériel scolaire',
      'Bijoux et accessoires', 'Vêtements de bébé', 'Épices et condiments',
      'Téléviseur', 'Tapis et décoration', 'Matériel agricole'
    ];
    const parcelStatuses = ['OPEN','OPEN','OPEN','MATCHED','BOOKED','BOOKED','CANCELLED','OPEN'];

    for (let i = 0; i < 18; i++) {
      const id = uid();
      const route = parcelRoutes[i];
      const senderId = senderIds[i % senderIds.length] || userIds[i % userIds.length];
      const weightKg = (1 + Math.random() * 19).toFixed(1);
      const declaredValue = randInt(5000, 200000);
      const status = parcelStatuses[i % parcelStatuses.length];

      await client.query(`
        INSERT INTO parcel_requests (id, "senderId", "originCity", "destinationCity",
          "desiredDate", "weightKg", description, "photoUrls", "declaredValue",
          status, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `, [id, senderId, route.from, route.to, future(randInt(1, 14)),
          parseFloat(weightKg), descriptions[i], '{}', declaredValue,
          status, past(randInt(5, 60)), past(randInt(0, 5))]);

      parcelIds.push({ id, senderId, from: route.from, to: route.to });
    }
    console.log(`  ✅ 18 demandes de colis créées`);

    // ═══════════════════════════════════════
    //  4. BOOKINGS (18 réservations)
    // ═══════════════════════════════════════
    console.log('📋 Insertion des réservations...');
    const bookingIds = [];
    const bookingStatuses = [
      'CONFIRMED','CONFIRMED','CONFIRMED',
      'DELIVERED','DELIVERED',
      'IN_TRANSIT','IN_TRANSIT',
      'ACCEPTED','ACCEPTED',
      'PENDING','PENDING','PENDING',
      'PARCEL_HANDED',
      'REFUSED',
      'CANCELLED',
      'DISPUTED',
      'CONFIRMED',
      'DELIVERED',
    ];

    for (let i = 0; i < 18; i++) {
      const id = uid();
      const trip = tripIds[i % tripIds.length];
      const parcel = parcelIds[i % parcelIds.length];
      const status = bookingStatuses[i];
      const weightKg = parseFloat((1 + Math.random() * 10).toFixed(1));
      const pricePerKg = randInt(300, 800);
      const totalAmount = Math.round(weightKg * pricePerKg);
      const commission = Math.round(totalAmount * 0.12);
      const carrierAmount = totalAmount - commission;
      const deliveryCode = String(100000 + i * 9973 + 42).substring(0, 6);
      const carrierId = carrierIds[i % carrierIds.length];
      const senderId = parcel.senderId;

      const acceptedAt = ['ACCEPTED','PARCEL_HANDED','IN_TRANSIT','DELIVERED','CONFIRMED','DISPUTED'].includes(status) ? past(randInt(10, 30)) : null;
      const parcelHandedAt = ['PARCEL_HANDED','IN_TRANSIT','DELIVERED','CONFIRMED'].includes(status) ? past(randInt(5, 15)) : null;
      const inTransitAt = ['IN_TRANSIT','DELIVERED','CONFIRMED'].includes(status) ? past(randInt(2, 10)) : null;
      const deliveredAt = ['DELIVERED','CONFIRMED'].includes(status) ? past(randInt(1, 5)) : null;
      const confirmedAt = status === 'CONFIRMED' ? past(randInt(0, 3)) : null;

      await client.query(`
        INSERT INTO bookings (id, "tripId", "parcelRequestId", "senderId", "carrierId",
          "weightKg", "totalAmount", commission, "carrierAmount", "deliveryCode",
          status, "acceptedAt", "parcelHandedAt", "inTransitAt", "deliveredAt",
          "confirmedAt", "acceptDeadline", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      `, [id, trip.id, parcel.id, senderId, carrierId,
          weightKg, totalAmount, commission, carrierAmount, deliveryCode,
          status, acceptedAt, parcelHandedAt, inTransitAt, deliveredAt,
          confirmedAt, future(2), past(randInt(15, 45)), past(randInt(0, 14))]);

      bookingIds.push({ id, senderId, carrierId, totalAmount, status });
    }
    console.log(`  ✅ 18 réservations créées`);

    // ═══════════════════════════════════════
    //  5. PAYMENTS (15 paiements)
    // ═══════════════════════════════════════
    console.log('💰 Insertion des paiements...');
    const paymentMethods = ['WAVE','WAVE','ORANGE_MONEY','ORANGE_MONEY','CARD'];
    let paymentCount = 0;
    for (let i = 0; i < bookingIds.length && paymentCount < 15; i++) {
      const b = bookingIds[i];
      if (['PENDING','REFUSED','CANCELLED'].includes(b.status)) continue;

      const payStatus = ['CONFIRMED','DELIVERED'].includes(b.status) ? 'RELEASED'
                      : ['IN_TRANSIT','PARCEL_HANDED','ACCEPTED'].includes(b.status) ? 'HELD'
                      : b.status === 'DISPUTED' ? 'HELD' : 'PENDING';
      const method = paymentMethods[paymentCount % paymentMethods.length];
      const heldAt = ['HELD','RELEASED'].includes(payStatus) ? past(randInt(5, 20)) : null;
      const releasedAt = payStatus === 'RELEASED' ? past(randInt(1, 5)) : null;

      await client.query(`
        INSERT INTO payments (id, "bookingId", amount, method, status,
          "providerRef", "heldAt", "releasedAt", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [uid(), b.id, b.totalAmount, method, payStatus,
          'PAY-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          heldAt, releasedAt, past(randInt(10, 30)), past(randInt(0, 5))]);

      paymentCount++;
    }
    console.log(`  ✅ ${paymentCount} paiements créés`);

    // ═══════════════════════════════════════
    //  6. REVIEWS (15 avis)
    // ═══════════════════════════════════════
    console.log('⭐ Insertion des avis...');
    const comments = [
      'Excellent service, colis livré à temps !', 'Très professionnel, je recommande.',
      'Rapide et fiable, merci !', 'Colis bien emballé et livré sans problème.',
      'Service impeccable, transporteur ponctuel.', 'Très satisfait de la livraison.',
      'Bon service mais léger retard.', 'Communicatif et sérieux.',
      'Parfait, rien à redire !', 'Livraison conforme aux attentes.',
      'Transporteur sympa et efficace.', 'Colis reçu en parfait état.',
      'Très bonne expérience ColiSN.', 'Service fiable et abordable.',
      'Je recommande vivement ce transporteur.'
    ];
    let reviewCount = 0;
    const usedBookingsForReview = new Set();
    for (let i = 0; i < bookingIds.length && reviewCount < 15; i++) {
      const b = bookingIds[i];
      if (!['CONFIRMED','DELIVERED'].includes(b.status)) continue;
      if (usedBookingsForReview.has(b.id)) continue;
      usedBookingsForReview.add(b.id);

      await client.query(`
        INSERT INTO reviews (id, "bookingId", "reviewerId", "reviewedId",
          rating, comment, "expiresAt", "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [uid(), b.id, b.senderId, b.carrierId,
          randInt(3, 5), comments[reviewCount % comments.length],
          future(72), past(randInt(1, 10))]);

      reviewCount++;
    }
    console.log(`  ✅ ${reviewCount} avis créés`);

    // ═══════════════════════════════════════
    //  7. DISPUTES (4 litiges)
    // ═══════════════════════════════════════
    console.log('⚖️  Insertion des litiges...');
    const reasons = [
      'Colis endommagé lors du transport',
      'Livraison en retard de plus de 3 jours',
      'Colis non livré, transporteur injoignable',
      'Contenu manquant à la livraison'
    ];
    const disputeStatuses = ['OPEN','UNDER_REVIEW','RESOLVED','OPEN'];
    let disputeCount = 0;
    const usedBookingsForDispute = new Set();
    for (let i = 0; i < bookingIds.length && disputeCount < 4; i++) {
      const b = bookingIds[i];
      if (b.status !== 'DISPUTED' && disputeCount < 2) continue;
      if (usedBookingsForDispute.has(b.id)) continue;
      usedBookingsForDispute.add(b.id);

      const dStatus = disputeStatuses[disputeCount];
      const resolvedById = dStatus === 'RESOLVED' ? adminId : null;
      const resolvedAt = dStatus === 'RESOLVED' ? past(2) : null;

      await client.query(`
        INSERT INTO disputes (id, "bookingId", "openedById", reason, description,
          status, resolution, "resolvedById", "resolvedAt", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [uid(), b.id, b.senderId, reasons[disputeCount],
          'Détails complets du litige : ' + reasons[disputeCount] + '. Contact avec le transporteur sans succès.',
          dStatus,
          dStatus === 'RESOLVED' ? 'Remboursement partiel accordé après investigation.' : null,
          resolvedById, resolvedAt,
          past(randInt(5, 20)), past(randInt(0, 5))]);

      disputeCount++;
    }
    // Ajouter litiges supplémentaires si besoin
    if (disputeCount < 4) {
      for (let i = 0; disputeCount < 4; i++) {
        const b = bookingIds[i % bookingIds.length];
        if (usedBookingsForDispute.has(b.id)) continue;
        usedBookingsForDispute.add(b.id);
        const dStatus = disputeStatuses[disputeCount];
        await client.query(`
          INSERT INTO disputes (id, "bookingId", "openedById", reason, description,
            status, "createdAt", "updatedAt")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [uid(), b.id, b.senderId, reasons[disputeCount],
            reasons[disputeCount] + ' — En attente de traitement.',
            dStatus, past(randInt(5, 20)), past(1)]);
        disputeCount++;
      }
    }
    console.log(`  ✅ ${disputeCount} litiges créés`);

    // ═══════════════════════════════════════
    //  8. NOTIFICATIONS (20+ notifs)
    // ═══════════════════════════════════════
    console.log('🔔 Insertion des notifications...');
    const notifData = [
      { type:'BOOKING_REQUEST',    title:'Nouvelle demande',      body:'Vous avez reçu une demande de réservation pour votre trajet Dakar → Thiès' },
      { type:'BOOKING_ACCEPTED',   title:'Réservation acceptée',  body:'Votre réservation a été acceptée ! Préparez votre colis.' },
      { type:'BOOKING_REFUSED',    title:'Réservation refusée',   body:'Votre demande a été refusée. Cherchez un autre transporteur.' },
      { type:'PARCEL_HANDED',      title:'Colis remis',           body:'Le colis a été remis au transporteur. Suivi en cours.' },
      { type:'IN_TRANSIT',         title:'En transit',            body:'Votre colis est en route vers sa destination.' },
      { type:'DELIVERED',          title:'Colis livré !',         body:'Votre colis a été livré. Confirmez la réception.' },
      { type:'PAYMENT_RECEIVED',   title:'Paiement reçu',         body:'Un paiement de 15 000 FCFA a été reçu pour votre trajet.' },
      { type:'PAYMENT_RELEASED',   title:'Paiement libéré',       body:'Votre paiement de 12 500 FCFA a été transféré sur votre compte.' },
      { type:'DISPUTE_OPENED',     title:'Litige ouvert',         body:'Un litige a été ouvert pour votre réservation.' },
      { type:'DISPUTE_RESOLVED',   title:'Litige résolu',         body:'Votre litige a été résolu. Un remboursement sera effectué.' },
      { type:'REVIEW_RECEIVED',    title:'Nouvel avis',           body:'Vous avez reçu un avis 5 étoiles de Mamadou Diallo.' },
      { type:'TRIP_MATCH',         title:'Trajet disponible',     body:'Un trajet Dakar → Ziguinchor correspond à votre demande.' },
      { type:'PARCEL_MATCH',       title:'Colis à transporter',   body:'Un colis sur votre route est disponible.' },
      { type:'SYSTEM',             title:'Bienvenue sur ColiSN',  body:'Votre compte a été créé avec succès. Complétez votre profil.' },
      { type:'OTP',                title:'Code de vérification',  body:'Votre code OTP est : 485923. Valable 10 minutes.' },
      { type:'BOOKING_REQUEST',    title:'2 nouvelles demandes',  body:'Vous avez 2 nouvelles demandes de réservation.' },
      { type:'IN_TRANSIT',         title:'Colis en route',        body:'Votre colis Dakar → Kaolack est en transit.' },
      { type:'PAYMENT_RECEIVED',   title:'Paiement confirmé',     body:'Paiement de 8 500 FCFA reçu via Wave.' },
      { type:'DELIVERED',          title:'Livraison confirmée',   body:'La livraison a été confirmée. Merci d\'utiliser ColiSN.' },
      { type:'SYSTEM',             title:'Mise à jour',           body:'De nouvelles fonctionnalités sont disponibles sur ColiSN.' },
    ];

    for (let i = 0; i < notifData.length; i++) {
      const n = notifData[i];
      const userId = userIds[i % userIds.length];
      const isRead = Math.random() > 0.4;
      await client.query(`
        INSERT INTO notifications (id, "userId", type, title, body, "isRead", "readAt",
          "pushSent", "smsSent", "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [uid(), userId, n.type, n.title, n.body, isRead,
          isRead ? past(randInt(0, 5)) : null,
          Math.random() > 0.3, Math.random() > 0.5,
          past(randInt(0, 30))]);
    }
    console.log(`  ✅ ${notifData.length} notifications créées`);

    await client.query('COMMIT');

    // ── Résumé ───────────────────────────────────────────────────
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM users'),
      client.query('SELECT COUNT(*) FROM trips'),
      client.query('SELECT COUNT(*) FROM parcel_requests'),
      client.query('SELECT COUNT(*) FROM bookings'),
      client.query('SELECT COUNT(*) FROM payments'),
      client.query('SELECT COUNT(*) FROM reviews'),
      client.query('SELECT COUNT(*) FROM disputes'),
      client.query('SELECT COUNT(*) FROM notifications'),
    ]);

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║      ✅ Seed terminé avec succès !       ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  👥 Utilisateurs  :', counts[0].rows[0].count, '                  ');
    console.log('║  🚗 Trajets       :', counts[1].rows[0].count, '                  ');
    console.log('║  📦 Demandes colis:', counts[2].rows[0].count, '                  ');
    console.log('║  📋 Réservations  :', counts[3].rows[0].count, '                  ');
    console.log('║  💰 Paiements     :', counts[4].rows[0].count, '                  ');
    console.log('║  ⭐ Avis           :', counts[5].rows[0].count, '                  ');
    console.log('║  ⚖️  Litiges        :', counts[6].rows[0].count, '                   ');
    console.log('║  🔔 Notifications  :', counts[7].rows[0].count, '                  ');
    console.log('╚══════════════════════════════════════════╝\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur seed:', err.message);
    console.error(err.stack);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(process.exit.bind(process, 1));
