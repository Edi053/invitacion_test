// ==========================================================
// BODA DE EDINSON BARRERA & JENNIFER SEQUEIRA
// Lógica de Invitación Pública (Módulo 2)
// Animaciones Keyframes, Apertura de Sobre, Música, Calendario y RSVP
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Constante de fecha nupcial: Sábado 19 de Diciembre de 2026, 04:30 p.m.
  const WEDDING_DATE = new Date('2026-12-19T16:30:00');
  const COUPLE_DEFAULT_PHONE = '50588888888'; // Teléfono WhatsApp por defecto para confirmaciones
  const SECURITY_SALT = 'Boda-Edinson-Jennifer-2026';

  // Elementos del DOM
  const envelopeSection = document.getElementById('envelopeSection');
  const envelopeCard = document.getElementById('envelopeCard');
  const openInstruction = document.getElementById('openInstruction');
  const invitationCard = document.getElementById('invitationCard');
  const tagFamilyName = document.getElementById('tagFamilyName');
  const tagPassesPill = document.getElementById('tagPassesPill');
  const invitationRecipientName = document.getElementById('invitationRecipientName');
  const passesNotice = document.getElementById('passesNotice');
  const whatsappRsvpBtn = document.getElementById('whatsappRsvpBtn');
  const addToCalendarBtn = document.getElementById('addToCalendarBtn');
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const petalsContainer = document.getElementById('petals-container');

  // ==========================================================
  // 1. DECODIFICACIÓN SEGURA DE PARÁMETROS DE LA INVITACIÓN
  // ==========================================================
  function computeHash(guest, passes) {
    const str = `${guest}|${passes}|${SECURITY_SALT}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  function parseGuestParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // 1.1 Intentar leer token seguro codificado en Base64 ('i' o 'inv')
    const token = urlParams.get('i') || urlParams.get('inv');
    if (token) {
      try {
        const jsonStr = decodeURIComponent(escape(atob(token.replace(/_/g, '/').replace(/-/g, '+'))));
        const data = JSON.parse(jsonStr);
        if (data && data.guest) {
          // Verificar hash de integridad
          const validHash = computeHash(data.guest, data.passes || 1);
          if (data.hash === validHash || !data.hash) {
            return {
              guest: data.guest,
              passes: parseInt(data.passes) || 1,
              phone: data.phone || COUPLE_DEFAULT_PHONE
            };
          }
        }
      } catch (e) {
        console.warn('Token codificado no válido o manipulado. Usando modo estándar.');
      }
    }

    // 1.2 Parámetros directos tradicionales
    const directGuest = urlParams.get('para') || urlParams.get('invitado');
    const directPasses = urlParams.get('pases') || urlParams.get('cupos');
    const directPhone = urlParams.get('tel');

    if (directGuest) {
      return {
        guest: directGuest,
        passes: parseInt(directPasses) || 1,
        phone: directPhone || COUPLE_DEFAULT_PHONE
      };
    }

    // 1.3 Modo de cortesía predeterminado cuando no hay parámetros
    return {
      guest: 'Estimada Familia y Amigos',
      passes: 2,
      phone: COUPLE_DEFAULT_PHONE
    };
  }

  const guestInfo = parseGuestParameters();

  // Renderizar datos en el sobre y en la tarjeta
  if (tagFamilyName) tagFamilyName.textContent = guestInfo.guest;
  if (invitationRecipientName) invitationRecipientName.textContent = guestInfo.guest;

  if (tagPassesPill) {
    if (guestInfo.passes > 0) {
      tagPassesPill.textContent = guestInfo.passes === 1 ? 'Válido para 1 pase' : `Válido para ${guestInfo.passes} pases`;
      tagPassesPill.style.display = 'inline-block';
    } else {
      tagPassesPill.style.display = 'none';
    }
  }

  if (passesNotice) {
    const passLabel = guestInfo.passes === 1 ? '1 pase personal' : `${guestInfo.passes} pases reservados`;
    passesNotice.innerHTML = `Invitación reservada con cariño para: <strong>${guestInfo.guest}</strong> (${passLabel})`;
  }

  // Configurar enlace de RSVP para WhatsApp
  if (whatsappRsvpBtn) {
    const textMsg = `¡Hola Edinson y Jennifer! ✨\n\nCon mucha alegría confirmo nuestra asistencia a su boda este Sábado 19 de Diciembre de 2026.\n\nInvitado: ${guestInfo.guest}\nPases confirmados: ${guestInfo.passes}\n\n¡Qué bendición compartir este día tan especial con ustedes! 💍🥂`;
    const cleanPhone = (guestInfo.phone || COUPLE_DEFAULT_PHONE).replace(/[^0-9]/g, '');
    whatsappRsvpBtn.href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textMsg)}`;
  }

  // ==========================================================
  // 2. APERTURA DEL SOBRE VIRTUAL CON ANIMACIONES @KEYFRAMES
  // ==========================================================
  let isEnvelopeOpened = false;

  function handleOpenEnvelope() {
    if (isEnvelopeOpened) return;
    isEnvelopeOpened = true;

    // Iniciar acompañamiento musical en piano
    startRomanticMusic();

    // Activar clase que dispara las animaciones CSS @keyframes
    envelopeSection.classList.add('opening-active');

    // Despliegue secuencial: revelar la tarjeta interior
    setTimeout(() => {
      envelopeSection.classList.add('hidden');
      invitationCard.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      triggerGoldenCelebration();
    }, 1500);
  }

  if (envelopeCard) envelopeCard.addEventListener('click', handleOpenEnvelope);
  if (openInstruction) openInstruction.addEventListener('click', handleOpenEnvelope);

  // ==========================================================
  // 3. MÚSICA ROMÁNTICA EN PIANO (CANON EN D CON WEB AUDIO API)
  // ==========================================================
  let audioCtx = null;
  let synthTimer = null;
  let isMusicPlaying = false;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPianoNote(freq, duration = 1.2, gainVol = 0.08) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      // Sonido de piano acústico suave
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainVol, audioCtx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('Audio note error:', err);
    }
  }

  function startRomanticMusic() {
    initAudioContext();
    if (!audioCtx || isMusicPlaying) return;
    isMusicPlaying = true;
    if (musicToggleBtn) musicToggleBtn.classList.add('playing');

    // Progresión de acordes del Canon en D
    const chordNotes = [
      [293.66, 369.99, 440.00], // Re mayor
      [220.00, 277.18, 329.63], // La mayor
      [246.94, 293.66, 369.99], // Si menor
      [185.00, 220.00, 277.18], // Fa# menor
      [196.00, 246.94, 293.66], // Sol mayor
      [146.83, 220.00, 293.66], // Re mayor
      [196.00, 246.94, 329.63], // Sol mayor
      [220.00, 277.18, 329.63]  // La mayor
    ];

    // Melodía romántica
    const melodyNotes = [
      587.33, 554.37, 493.88, 440.00, 392.00, 369.99, 392.00, 440.00,
      587.33, 659.25, 739.99, 587.33, 493.88, 587.33, 554.37, 440.00
    ];

    let chordStep = 0;
    let melodyStep = 0;

    // Tocar el primer acorde de inmediato
    chordNotes[0].forEach((n, idx) => {
      setTimeout(() => playPianoNote(n, 2.4, 0.06), idx * 120);
    });

    synthTimer = setInterval(() => {
      if (!isMusicPlaying || !audioCtx) return;

      // Acorde suave de fondo cada compás
      chordStep = (chordStep + 1) % chordNotes.length;
      const currentChord = chordNotes[chordStep];
      currentChord.forEach((freq, idx) => {
        setTimeout(() => playPianoNote(freq, 2.2, 0.05), idx * 130);
      });

      // Melodía superior lírica
      setTimeout(() => {
        playPianoNote(melodyNotes[melodyStep], 1.5, 0.08);
        melodyStep = (melodyStep + 1) % melodyNotes.length;
      }, 500);

      setTimeout(() => {
        playPianoNote(melodyNotes[melodyStep], 1.4, 0.07);
        melodyStep = (melodyStep + 1) % melodyNotes.length;
      }, 1000);

    }, 1800);
  }

  function pauseRomanticMusic() {
    isMusicPlaying = false;
    if (synthTimer) clearInterval(synthTimer);
    if (musicToggleBtn) musicToggleBtn.classList.remove('playing');
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMusicPlaying) {
        pauseRomanticMusic();
      } else {
        startRomanticMusic();
      }
    });
  }

  // ==========================================================
  // 4. CONTADOR REGRESIVO EN TIEMPO REAL
  // ==========================================================
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = WEDDING_DATE.getTime() - now;

    if (distance <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      return;
    }

    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ==========================================================
  // 5. AGENDAR EN CALENDARIO (GOOGLE + ARCHIVO .ICS NATIVO)
  // ==========================================================
  function generateCalendarEvent() {
    const title = 'Boda de Edinson Barrera & Jennifer Sequeira';
    const description = 'Celebración de la boda religiosa y recepción de Edinson y Jennifer. ¡Acompáñanos a celebrar el inicio de nuestra vida juntos!';
    const location = 'Santuario Parroquia Divino Niño, Juigalpa, Chontales';
    const startDate = '20261219T223000Z'; // 4:30 PM hora local Nicaragua (UTC-6) -> 22:30 UTC
    const endDate = '20261220T070000Z';   // Hasta el final de la fiesta

    // 5.1 Enlace directo a Google Calendar
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    // 5.2 Archivo .ics para dispositivos móviles (Apple Calendar, Samsung, Outlook)
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Edinson and Jennifer//Wedding Invitation//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'DESCRIPTION:Recordatorio Boda Edinson & Jennifer mañana',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Descargar el archivo .ics y abrir Google Calendar
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'Boda-Edinson-y-Jennifer.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Abrir Google Calendar en pestaña nueva como respaldo
    setTimeout(() => {
      window.open(googleCalendarUrl, '_blank');
    }, 600);
  }

  if (addToCalendarBtn) {
    addToCalendarBtn.addEventListener('click', generateCalendarEvent);
  }

  // ==========================================================
  // 6. GENERADOR DE PÉTALOS Y DESTELLOS FLOTANTES
  // ==========================================================
  function createAmbientPetals() {
    if (!petalsContainer) return;
    for (let i = 0; i < 16; i++) {
      const petal = document.createElement('div');
      petal.className = 'floating-petal';
      const size = Math.random() * 8 + 6;
      petal.style.width = `${size}px`;
      petal.style.height = `${size * 1.3}px`;
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${Math.random() * 8 + 7}s`;
      petal.style.animationDelay = `${Math.random() * 6}s`;
      petalsContainer.appendChild(petal);
    }
  }
  createAmbientPetals();

  function triggerGoldenCelebration() {
    if (!petalsContainer) return;
    for (let i = 0; i < 24; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'floating-petal';
      sparkle.style.background = 'radial-gradient(circle, #fff3d1 0%, #d4af37 80%)';
      sparkle.style.width = '7px';
      sparkle.style.height = '7px';
      sparkle.style.borderRadius = '50%';
      sparkle.style.left = `${Math.random() * 100}%`;
      sparkle.style.top = `${Math.random() * 20}%`;
      sparkle.style.animationDuration = `${Math.random() * 4 + 3}s`;
      petalsContainer.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 4000);
    }
  }
});
