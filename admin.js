// ==========================================================
// BODA DE EDINSON BARRERA & JENNIFER SEQUEIRA
// Lógica del Panel de Novios (Módulo 1: Creador de Invitaciones)
// Generador Seguro, Enlaces WhatsApp, Almacenamiento Local y CSV
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
  const SECURITY_SALT = 'Boda-Edinson-Jennifer-2026';
  const DEFAULT_PIN = '1912'; // 19 de Diciembre

  // Claves de Almacenamiento Local
  const STORAGE_GUESTS = 'boda_guests_list_v1';
  const STORAGE_COUPLE_PHONE = 'boda_couple_phone_v1';
  const STORAGE_PIN = 'boda_admin_pin_v1';
  const SESSION_AUTH = 'boda_admin_authenticated';

  // Elementos del DOM - PIN
  const pinOverlay = document.getElementById('pinOverlay');
  const inputPin = document.getElementById('inputPin');
  const btnUnlock = document.getElementById('btnUnlock');
  const pinErrorMsg = document.getElementById('pinErrorMsg');

  // Elementos del Formulario
  const inputGuestName = document.getElementById('inputGuestName');
  const inputPasses = document.getElementById('inputPasses');
  const inputCouplePhone = document.getElementById('inputCouplePhone');
  const inputGuestPhone = document.getElementById('inputGuestPhone');
  const optSecureLink = document.getElementById('optSecureLink');
  const generatedUrlInput = document.getElementById('generatedUrlInput');
  const btnCopyUrl = document.getElementById('btnCopyUrl');
  const btnCopyMessage = document.getElementById('btnCopyMessage');
  const btnSendWhatsApp = document.getElementById('btnSendWhatsApp');
  const btnSaveGuest = document.getElementById('btnSaveGuest');
  const passesSelector = document.getElementById('passesSelector');

  // Elementos de Previa
  const miniTagName = document.getElementById('miniTagName');
  const miniTagPasses = document.getElementById('miniTagPasses');
  const btnPreviewExternal = document.getElementById('btnPreviewExternal');

  // Elementos de Tabla y Métricas
  const guestsTableBody = document.getElementById('guestsTableBody');
  const searchGuestInput = document.getElementById('searchGuestInput');
  const metricTotalGuests = document.getElementById('metricTotalGuests');
  const metricTotalPasses = document.getElementById('metricTotalPasses');
  const metricTotalSent = document.getElementById('metricTotalSent');
  const metricTotalConfirmed = document.getElementById('metricTotalConfirmed');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnChangePin = document.getElementById('btnChangePin');

  // ==========================================================
  // 1. SISTEMA DE AUTENTICACIÓN POR PIN
  // ==========================================================
  function checkAuth() {
    const isAuthed = sessionStorage.getItem(SESSION_AUTH);
    if (isAuthed === 'true') {
      pinOverlay.classList.add('hidden');
    } else {
      pinOverlay.classList.remove('hidden');
      inputPin.focus();
    }
  }

  function handleUnlock() {
    const enteredPin = inputPin.value.trim();
    const currentPin = localStorage.getItem(STORAGE_PIN) || DEFAULT_PIN;

    if (enteredPin === currentPin) {
      sessionStorage.setItem(SESSION_AUTH, 'true');
      pinOverlay.classList.add('hidden');
      if (pinErrorMsg) pinErrorMsg.style.display = 'none';
      inputGuestName.focus();
    } else {
      if (pinErrorMsg) {
        pinErrorMsg.textContent = '❌ PIN incorrecto. Intenta de nuevo.';
        pinErrorMsg.style.display = 'block';
      }
      inputPin.value = '';
      inputPin.focus();
    }
  }

  btnUnlock.addEventListener('click', handleUnlock);
  inputPin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock();
  });

  checkAuth();

  // Cambiar PIN
  if (btnChangePin) {
    btnChangePin.addEventListener('click', () => {
      const currentPin = localStorage.getItem(STORAGE_PIN) || DEFAULT_PIN;
      const oldPin = prompt('Introduce tu PIN actual:');
      if (oldPin !== currentPin) {
        alert('PIN actual incorrecto.');
        return;
      }
      const newPin = prompt('Introduce el nuevo PIN (4 dígitos numéricos):');
      if (newPin && newPin.trim().length >= 4) {
        localStorage.setItem(STORAGE_PIN, newPin.trim());
        alert('✅ PIN actualizado exitosamente.');
      } else {
        alert('El PIN debe tener al menos 4 caracteres.');
      }
    });
  }

  // ==========================================================
  // 2. CONFIGURACIÓN Y PERSISTENCIA
  // ==========================================================
  // Cargar teléfono de los novios
  const savedPhone = localStorage.getItem(STORAGE_COUPLE_PHONE) || '50588888888';
  inputCouplePhone.value = savedPhone;

  inputCouplePhone.addEventListener('change', () => {
    localStorage.setItem(STORAGE_COUPLE_PHONE, inputCouplePhone.value.trim());
    updateGeneratedOutputs();
  });

  // Lista de Invitados
  function getStoredGuests() {
    try {
      const data = localStorage.getItem(STORAGE_GUESTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error al leer invitados:', e);
      return [];
    }
  }

  function saveStoredGuests(guests) {
    localStorage.setItem(STORAGE_GUESTS, JSON.stringify(guests));
    renderGuestsTable();
    updateMetrics();
  }

  // ==========================================================
  // 3. GENERADOR DE TOKENS SEGUROS Y URLS
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

  function generateSecureToken(guest, passes, phone) {
    const payload = {
      guest: guest.trim(),
      passes: parseInt(passes) || 1,
      phone: phone.replace(/[^0-9]/g, ''),
      hash: computeHash(guest.trim(), parseInt(passes) || 1),
      t: Date.now()
    };
    const jsonStr = unescape(encodeURIComponent(JSON.stringify(payload)));
    return btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function getBaseInvitationUrl() {
    const currentLoc = window.location.href;
    const url = new URL(currentLoc);
    // Cambiar creador.html por index.html o agregar index.html si es directorio
    let path = url.pathname;
    if (path.endsWith('creador.html')) {
      path = path.replace('creador.html', 'index.html');
    } else if (!path.endsWith('index.html')) {
      path = path.replace(/\/$/, '') + '/index.html';
    }
    return `${url.protocol}//${url.host}${path}`;
  }

  function buildInvitationUrl(guest, passes, phone, useSecure) {
    const baseUrl = getBaseInvitationUrl();
    if (useSecure) {
      const token = generateSecureToken(guest, passes, phone);
      return `${baseUrl}?inv=${token}`;
    } else {
      const params = new URLSearchParams();
      params.set('para', guest);
      params.set('pases', passes);
      params.set('tel', phone);
      return `${baseUrl}?${params.toString()}`;
    }
  }

  function buildWhatsAppMessage(guest, passes, url) {
    const passWord = passes === 1 ? 'pase personal' : `${passes} pases`;
    return `💍 *Nuestra Boda: Edinson & Jennifer* 💍\n\n` +
      `Estimada *${guest}*,\n` +
      `Con la bendición de Dios y nuestros padres, tenemos el inmenso honor de invitarles a celebrar el inicio de nuestra vida juntos.\n\n` +
      `🎟️ *Pases reservados:* ${passWord}\n` +
      `📅 *Fecha:* Sábado 19 de Diciembre de 2026\n` +
      `⛪ *Ceremonia Religiosa:* Parroquia Divino Niño (04:30 p.m.)\n` +
      `🥂 *Recepción:* Hotel San Pedro (07:00 p.m.)\n\n` +
      `💌 *Toca el enlace para abrir tu sobre e invitación interactiva:*\n${url}\n\n` +
      `_Favor confirmar asistencia antes del 15 de noviembre._\n` +
      `¡Esperamos contar con su hermosa compañía! ✨`;
  }

  // ==========================================================
  // 4. ACTUALIZACIÓN EN TIEMPO REAL
  // ==========================================================
  function updateGeneratedOutputs() {
    const guest = inputGuestName.value.trim() || 'Familia Flores Oporta';
    const passes = parseInt(inputPasses.value) || 2;
    const couplePhone = inputCouplePhone.value.trim() || '50588888888';
    const guestPhone = inputGuestPhone.value.trim();
    const useSecure = optSecureLink.checked;

    // Enlace generado
    const generatedUrl = buildInvitationUrl(guest, passes, couplePhone, useSecure);
    generatedUrlInput.value = generatedUrl;

    // Previa en vivo
    miniTagName.textContent = guest;
    miniTagPasses.textContent = passes === 1 ? '1 pase' : `${passes} pases`;
    btnPreviewExternal.href = generatedUrl;

    // Configurar botón directo de WhatsApp
    const message = buildWhatsAppMessage(guest, passes, generatedUrl);
    const cleanGuestPhone = guestPhone.replace(/[^0-9]/g, '');

    let waLink = '';
    if (cleanGuestPhone.length >= 8) {
      waLink = `https://api.whatsapp.com/send?phone=${cleanGuestPhone}&text=${encodeURIComponent(message)}`;
    } else {
      waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    btnSendWhatsApp.href = waLink;
  }

  inputGuestName.addEventListener('input', updateGeneratedOutputs);
  inputPasses.addEventListener('input', updateGeneratedOutputs);
  inputGuestPhone.addEventListener('input', updateGeneratedOutputs);
  optSecureLink.addEventListener('change', updateGeneratedOutputs);

  // Selector rápido de pases
  passesSelector.querySelectorAll('.pass-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      passesSelector.querySelectorAll('.pass-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      inputPasses.value = btn.dataset.value;
      updateGeneratedOutputs();
    });
  });

  // Copiar Enlace
  btnCopyUrl.addEventListener('click', () => {
    generatedUrlInput.select();
    navigator.clipboard.writeText(generatedUrlInput.value).then(() => {
      const original = btnCopyUrl.innerHTML;
      btnCopyUrl.innerHTML = '✅ ¡Copiado!';
      setTimeout(() => btnCopyUrl.innerHTML = original, 2000);
    });
  });

  // Copiar Mensaje Completo
  btnCopyMessage.addEventListener('click', () => {
    const guest = inputGuestName.value.trim() || 'Familia Flores Oporta';
    const passes = parseInt(inputPasses.value) || 2;
    const msg = buildWhatsAppMessage(guest, passes, generatedUrlInput.value);
    navigator.clipboard.writeText(msg).then(() => {
      const original = btnCopyMessage.innerHTML;
      btnCopyMessage.innerHTML = '✅ ¡Mensaje Copiado!';
      setTimeout(() => btnCopyMessage.innerHTML = original, 2000);
    });
  });

  // ==========================================================
  // 5. GESTOR DE LISTA DE INVITADOS (CRUD)
  // ==========================================================
  btnSaveGuest.addEventListener('click', () => {
    const guestName = inputGuestName.value.trim();
    if (!guestName) {
      alert('Por favor escribe el nombre del invitado o familia.');
      inputGuestName.focus();
      return;
    }

    const passes = parseInt(inputPasses.value) || 2;
    const guestPhone = inputGuestPhone.value.trim();
    const couplePhone = inputCouplePhone.value.trim() || '50588888888';
    const url = buildInvitationUrl(guestName, passes, couplePhone, optSecureLink.checked);

    const guests = getStoredGuests();
    const newGuest = {
      id: 'g_' + Date.now(),
      name: guestName,
      passes: passes,
      phone: guestPhone,
      status: 'pendiente', // pendiente, enviada, confirmada
      url: url,
      createdAt: new Date().toISOString()
    };

    guests.push(newGuest);
    saveStoredGuests(guests);

    // Feedback
    btnSaveGuest.innerHTML = '✅ ¡Guardado en Lista!';
    setTimeout(() => {
      btnSaveGuest.innerHTML = '➕ Guardar en mi Lista de Invitados';
      // Limpiar para el siguiente
      inputGuestName.value = '';
      inputGuestPhone.value = '';
      inputGuestName.focus();
      updateGeneratedOutputs();
    }, 1200);
  });

  function renderGuestsTable() {
    const guests = getStoredGuests();
    const query = (searchGuestInput.value || '').toLowerCase().trim();

    const filtered = guests.filter(g => g.name.toLowerCase().includes(query) || (g.phone && g.phone.includes(query)));

    if (filtered.length === 0) {
      guestsTableBody.innerHTML = `<tr><td colspan="6" class="empty-table-msg">No hay invitados registrados todavía. ¡Crea el primero arriba!</td></tr>`;
      return;
    }

    guestsTableBody.innerHTML = filtered.map((g, idx) => {
      let statusClass = 'status-pendiente';
      let statusText = 'Pendiente';
      if (g.status === 'enviada') {
        statusClass = 'status-enviada';
        statusText = 'Enviada 📲';
      } else if (g.status === 'confirmada') {
        statusClass = 'status-confirmada';
        statusText = 'Confirmada 🥂';
      }

      const waMsg = buildWhatsAppMessage(g.name, g.passes, g.url);
      const cleanPhone = (g.phone || '').replace(/[^0-9]/g, '');
      const waLink = cleanPhone.length >= 8
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMsg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;

      return `
        <tr>
          <td><strong>#${idx + 1}</strong></td>
          <td><strong>${escapeHtml(g.name)}</strong></td>
          <td><span class="mini-tag-passes">${g.passes} ${g.passes === 1 ? 'pase' : 'pases'}</span></td>
          <td>${g.phone ? escapeHtml(g.phone) : '<span style="color:#aaa;">—</span>'}</td>
          <td>
            <span class="status-badge ${statusClass}" data-id="${g.id}" title="Haz clic para cambiar estado">
              ${statusText}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <a href="${waLink}" target="_blank" class="btn-tbl-action btn-tbl-wa" data-id="${g.id}" title="Enviar por WhatsApp">
                💬
              </a>
              <button class="btn-tbl-action btn-tbl-copy" data-url="${escapeHtml(g.url)}" title="Copiar Enlace">
                📋
              </button>
              <a href="${escapeHtml(g.url)}" target="_blank" class="btn-tbl-action" title="Ver Invitación">
                👁️
              </a>
              <button class="btn-tbl-action btn-tbl-del" data-id="${g.id}" title="Eliminar Invitado">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableEvents();
  }

  function attachTableEvents() {
    // Cambiar estado al hacer clic en el badge
    guestsTableBody.querySelectorAll('.status-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const id = badge.dataset.id;
        const guests = getStoredGuests();
        const g = guests.find(item => item.id === id);
        if (g) {
          if (g.status === 'pendiente') g.status = 'enviada';
          else if (g.status === 'enviada') g.status = 'confirmada';
          else g.status = 'pendiente';
          saveStoredGuests(guests);
        }
      });
    });

    // Enviar WhatsApp desde tabla marca automáticamente como enviada
    guestsTableBody.querySelectorAll('.btn-tbl-wa').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const guests = getStoredGuests();
        const g = guests.find(item => item.id === id);
        if (g && g.status === 'pendiente') {
          g.status = 'enviada';
          saveStoredGuests(guests);
        }
      });
    });

    // Copiar enlace desde tabla
    guestsTableBody.querySelectorAll('.btn-tbl-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
          btn.innerHTML = '✅';
          setTimeout(() => btn.innerHTML = '📋', 1500);
        });
      });
    });

    // Eliminar invitado
    guestsTableBody.querySelectorAll('.btn-tbl-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('¿Seguro que deseas eliminar a este invitado de la lista?')) {
          let guests = getStoredGuests();
          guests = guests.filter(item => item.id !== id);
          saveStoredGuests(guests);
        }
      });
    });
  }

  function updateMetrics() {
    const guests = getStoredGuests();
    const totalGuests = guests.length;
    const totalPasses = guests.reduce((sum, g) => sum + (parseInt(g.passes) || 0), 0);
    const sentCount = guests.filter(g => g.status === 'enviada' || g.status === 'confirmada').length;
    const confirmedCount = guests.filter(g => g.status === 'confirmada').length;

    if (metricTotalGuests) metricTotalGuests.textContent = totalGuests;
    if (metricTotalPasses) metricTotalPasses.textContent = totalPasses;
    if (metricTotalSent) metricTotalSent.textContent = sentCount;
    if (metricTotalConfirmed) metricTotalConfirmed.textContent = confirmedCount;
  }

  if (searchGuestInput) {
    searchGuestInput.addEventListener('input', renderGuestsTable);
  }

  // Exportar a Excel / CSV
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const guests = getStoredGuests();
      if (guests.length === 0) {
        alert('No hay invitados para exportar.');
        return;
      }

      let csv = '\uFEFF'; // BOM para que Excel soporte tildes y caracteres en español
      csv += 'Numero,Nombre_Invitado,Pases,Telefono,Estado,Enlace_Invitacion\n';

      guests.forEach((g, idx) => {
        const row = [
          idx + 1,
          `"${(g.name || '').replace(/"/g, '""')}"`,
          g.passes,
          `"${g.phone || ''}"`,
          g.status,
          `"${g.url || ''}"`
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Lista-Invitados-Boda-Edinson-y-Jennifer-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Limpiar lista completa
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      if (confirm('⚠️ ¿Estás seguro de que deseas vaciar toda la lista de invitados? Esta acción no se puede deshacer.')) {
        saveStoredGuests([]);
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Inicialización
  updateGeneratedOutputs();
  renderGuestsTable();
  updateMetrics();
});
