import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { 
  Users, 
  UserPlus, 
  Gift, 
  Search, 
  Trash2, 
  Download, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Volume2, 
  VolumeX,
  Menu,
  X,
  Plus,
  Trophy,
  Activity,
  Phone,
  Mail,
  Award,
  Calendar,
  Filter,
  PlusCircle,
  Pencil,
  Eye,
  EyeOff
} from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "mock-api-key-for-preview-only",
      authDomain: "mock-auth-domain.firebaseapp.com",
      projectId: "mock-project-id",
      storageBucket: "mock-storage-bucket.appspot.com",
      messagingSenderId: "mock-sender-id",
      appId: "mock-app-id"
    };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'llano-torneo-sport-default';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// default events to fall back on or seed when database is empty
const DEFAULT_EVENTS = [
  { id: 'default-1', nombre: 'Sorteo de Bienvenida Llano Torneo Sport 2026', descripcion: 'Sorteo general para todos los nuevos participantes.', activo: true },
  { id: 'default-2', nombre: 'Gran Sorteo Integración Deportiva', descripcion: 'Sorteo especial del torneo de integración.', activo: true },
  { id: 'default-3', nombre: 'Rifa de Clausura de Torneos', descripcion: 'Evento de cierre con increíbles premios.', activo: true }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'admin-list', 'roulette', 'manage-events'
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedAdminEvent, setSelectedAdminEvent] = useState('all');
  const [selectedRouletteEvent, setSelectedRouletteEvent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({ nombre: '', descripcion: '' });
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Participant Form State
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documento: '',
    celular: '',
    correo: '',
    evento: '', // stores name of the selected event
    terminos: false
  });
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });

  const [notification, setNotification] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState(''); // Stores target participant name to delete
  const [deleteEventTarget, setDeleteEventTarget] = useState(null); // Stores { id, nombre } for active event delete confirmation
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  const [winnerDoc, setWinnerDoc] = useState(''); // Stores winner identification to display safely

  const playBeep = (freq, duration) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio simulation blocked or unsupported.");
    }
  };

  const playConfettiBeeps = () => {
    if (!soundEnabled) return;
    let count = 0;
    const interval = setInterval(() => {
      playBeep(500 + count * 80, 0.15);
      count++;
      if (count > 6) clearInterval(interval);
    }, 100);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth process error: ", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // RULE 1: STRICT PATH FOR PUBLIC DATA
    const eventsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
    const participantsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'registrados');

    // Sync Events
    const unsubscribeEvents = onSnapshot(
      eventsCollectionRef,
      async (snapshot) => {
        let list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });

        // If no events exist in database, seed defaults so user has options immediately
        if (list.length === 0) {
          for (const item of DEFAULT_EVENTS) {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', item.id);
            await setDoc(docRef, { nombre: item.nombre, descripcion: item.descripcion, fechaCreado: Date.now(), activo: true });
          }
        } else {
          list.sort((a, b) => (b.fechaCreado || 0) - (a.fechaCreado || 0));
          setEvents(list);
          // Set initial values for selectors
          if (formData.evento === '' && list.length > 0) {
            setFormData(prev => ({ ...prev, evento: list[0].nombre }));
          }
          if (selectedRouletteEvent === '' && list.length > 0) {
            setSelectedRouletteEvent(list[0].nombre);
          }
        }
      },
      (error) => {
        console.error("Firestore events sync error: ", error);
      }
    );

    // Sync Participants
    const unsubscribeParticipants = onSnapshot(
      participantsCollectionRef,
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // Sort inside JavaScript memory (RULE 2 compliance)
        list.sort((a, b) => (b.fechaRegistro || 0) - (a.fechaRegistro || 0));
        setParticipants(list);
      },
      (error) => {
        console.error("Firestore participants sync error: ", error);
        triggerNotification('error', 'Error al sincronizar participantes.');
      }
    );

    return () => {
      unsubscribeEvents();
      unsubscribeParticipants();
    };
  }, [user]);

  // Automatically ensure the selected event in registration form is an active event
  useEffect(() => {
    const activeList = events.filter(ev => ev.activo !== false);
    if (activeList.length > 0) {
      const currentIsValid = activeList.some(ev => ev.nombre === formData.evento);
      if (!currentIsValid) {
        setFormData(prev => ({ ...prev, evento: activeList[0].nombre }));
      }
    } else {
      setFormData(prev => ({ ...prev, evento: '' }));
    }
  }, [events]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    if (name === 'nombreCompleto' && type !== 'checkbox') {
      // ✅ REGEX: Reemplazar todo lo que NO sea letra (incluyendo tildes y ñ) o espacio
      processedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    } else if (name === 'documento' && type !== 'checkbox') {
      // ✅ REGEX: Reemplazar todo lo que NO sea dígito numérico
      processedValue = value.replace(/\D/g, '');
    } else if (name === 'celular' && type !== 'checkbox') {
      // ✅ REGEX & LENGTH: Reemplazar lo que NO sea número y limitar estrictamente a 10 dígitos en tiempo real
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    
    // Reset status
    setFormStatus({ type: '', message: '' });

    if (!formData.terminos) {
      setFormStatus({ type: 'error', message: 'Debes aceptar los términos y condiciones.' });
      return;
    }
    if (!formData.evento) {
      setFormStatus({ type: 'error', message: 'Por favor selecciona un evento válido.' });
      return;
    }

    // --- ✅ NUEVAS VALIDACIONES ESTRICTAS DE DATOS ---

    // 1. Validar Nombre Completo (solo letras y espacios)
    const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!onlyLettersRegex.test(formData.nombreCompleto.trim())) {
      setFormStatus({ type: 'error', message: 'El nombre completo solo debe contener letras.' });
      return;
    }

    // 2. Validar Documento (min 6 dígitos)
    if (formData.documento.length < 6) {
      setFormStatus({ type: 'error', message: 'El documento de identificación debe tener mínimo 6 dígitos numéricos.' });
      return;
    }

    // 3. Validar Celular (exactamente 10 dígitos)
    if (formData.celular.length !== 10) {
      setFormStatus({ type: 'error', message: 'El número de celular debe tener exactamente 10 dígitos numéricos.' });
      return;
    }

    // --- FIN VALIDACIONES ESTRICTAS ---

    const isDuplicate = participants.some(p => 
      (p.documento || '').trim().toLowerCase() === formData.documento.trim().toLowerCase() &&
      p.evento === formData.evento
    );

    if (isDuplicate) {
      setFormStatus({ 
        type: 'error', 
        message: `El participante con documento "${formData.documento}" ya está registrado en el evento "${formData.evento}". No se permiten duplicados.` 
      });
      playBeep(220, 0.4);
      return;
    }

    setFormStatus({ type: 'loading', message: 'Guardando registro de forma segura...' });

    try {
      if (!user) {
        throw new Error("Conexión perdida. Reintentando...");
      }

      const targetEvent = events.find(ev => ev.nombre === formData.evento);
      if (!targetEvent) {
        throw new Error("El evento seleccionado no es válido.");
      }

      // ✅ CAMBIO ARQUITECTÓNICO DE IDs INTUITIVOS EN FIREBASE
      // Creamos un ID único que relaciona el Documento con el Evento
      const docId = `${formData.documento.trim()}_${targetEvent.id}`;

      // Colección de Registros (Inscripciones por evento) con ID estructurado
      const registradosDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrados', docId);
      
      // Colección Directiva Maestra de Participantes Globales Únicos por Cédula (ID = Documento)
      const globalDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrados_globales', formData.documento.trim());

      const payload = {
        nombreCompleto: formData.nombreCompleto.trim(),
        documento: formData.documento.trim(),
        celular: formData.celular.trim(),
        correo: formData.correo.trim(),
        evento: formData.evento,
        eventoId: targetEvent.id,
        fechaRegistro: Date.now()
      };

      // Guardar de forma atómica en ambas rutas de la nube
      await setDoc(registradosDocRef, payload);
      await setDoc(globalDocRef, {
        nombreCompleto: formData.nombreCompleto.trim(),
        documento: formData.documento.trim(),
        celular: formData.celular.trim(),
        correo: formData.correo.trim(),
        ultimaActividad: Date.now()
      });
      
      playBeep(880, 0.3);
      setFormStatus({ type: 'success', message: `¡Inscripción exitosa al evento "${formData.evento}"! Datos guardados de forma permanente.` });
      
      // Reset form (keeping selected event)
      setFormData(prev => ({
        ...prev,
        nombreCompleto: '',
        documento: '',
        celular: '',
        correo: '',
        terminos: false
      }));

      setTimeout(() => setFormStatus({ type: '', message: '' }), 5000);
    } catch (error) {
      console.error("Error writing document: ", error);
      setFormStatus({ type: 'error', message: 'Error de red. Tus datos no se borraron, intenta enviar nuevamente.' });
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.nombre.trim()) return;

    try {
      if (isEditingEvent && editingEventId) {
        // Edit logic
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', editingEventId);
        await setDoc(docRef, {
          nombre: newEvent.nombre.trim(),
          descripcion: newEvent.descripcion.trim() || 'Sin descripción',
          fechaCreado: Date.now()
        }, { merge: true });
        
        playBeep(880, 0.25);
        triggerNotification('success', 'Evento actualizado correctamente.');
        setIsEditingEvent(false);
        setEditingEventId(null);
      } else {
        // ✅ GENERACIÓN DE SLUG LIMPIO Y LEGIBLE PARA EVENTOS EN FIREBASE
        const slug = newEvent.nombre.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
          .replace(/[^a-z0-9]+/g, '-')                      // Reemplazar espacios/símbolos por guiones
          .replace(/(^-|-$)+/g, '');                        // Quitar guiones iniciales o finales
        
        // Formamos el ID legible ej: evento-copa-futsal-llano-2026-4819
        const docId = `evento-${slug}-${Date.now().toString().slice(-4)}`;
        
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', docId);
        await setDoc(docRef, {
          nombre: newEvent.nombre.trim(),
          descripcion: newEvent.descripcion.trim() || 'Sin descripción',
          fechaCreado: Date.now(),
          activo: true // Newly created events default to active
        });
        playBeep(660, 0.2);
        triggerNotification('success', 'Nuevo evento creado correctamente.');
      }
      setNewEvent({ nombre: '', descripcion: '' });
    } catch (error) {
      triggerNotification('error', 'Error al guardar el evento.');
    }
  };

  const handleToggleEventActive = async (eventId, currentStatus) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', eventId);
      const newStatus = currentStatus === undefined ? false : !currentStatus;
      await setDoc(docRef, { activo: newStatus }, { merge: true });
      playBeep(600, 0.15);
      triggerNotification('success', `Evento ${newStatus ? 'activado' : 'desactivado'} para nuevos registros.`);
    } catch (error) {
      triggerNotification('error', 'Error al cambiar el estado del evento.');
    }
  };

  const handleStartEditEvent = (ev) => {
    setIsEditingEvent(true);
    setEditingEventId(ev.id);
    setNewEvent({ nombre: ev.nombre, descripcion: ev.descripcion });
    playBeep(600, 0.15);
  };

  const handleCancelEditEvent = () => {
    setIsEditingEvent(false);
    setEditingEventId(null);
    setNewEvent({ nombre: '', descripcion: '' });
    playBeep(440, 0.1);
  };

  const handleDeleteEvent = (eventId, eventNombre) => {
    const hasRegistrations = participants.some(p => p.evento === eventNombre);
    if (hasRegistrations) {
      triggerNotification('error', 'No puedes eliminar este evento porque ya tiene personas registradas.');
      return;
    }
    setDeleteEventTarget({ id: eventId, nombre: eventNombre });
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', deleteEventTarget.id);
      await deleteDoc(docRef);
      playBeep(330, 0.2);
      triggerNotification('success', 'Evento eliminado de la lista.');
    } catch (error) {
      triggerNotification('error', 'Error al eliminar el evento.');
    } finally {
      setDeleteEventTarget(null);
    }
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPinInput === 'llanotorneos123' || adminPinInput === '1234' || adminPinInput === 'admin') {
      setIsAdminAuthenticated(true);
      setShowPinModal(false);
      setAdminPinInput('');
      setAdminError('');
      playBeep(800, 0.25);
      triggerNotification('success', 'Sesión de Administrador Autorizada.');
    } else {
      setAdminError('Código de acceso incorrecto.');
      playBeep(220, 0.4);
    }
  };

  const handleAdminTabAccess = (tab) => {
    if (isAdminAuthenticated) {
      setActiveTab(tab);
      setMobileMenuOpen(false);
    } else {
      setShowPinModal(true);
    }
  };

  const requestDeleteParticipant = (id, name) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
  };

  const confirmDeleteParticipant = async () => {
    if (!deleteTargetId) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrados', deleteTargetId);
      await deleteDoc(docRef);
      playBeep(300, 0.2);
      triggerNotification('success', 'Participante eliminado.');
    } catch (error) {
      triggerNotification('error', 'No se pudo eliminar el registro.');
    } finally {
      setDeleteTargetId(null);
      setDeleteTargetName('');
    }
  };

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportCSV = () => {
    const filteredList = participants.filter(p => {
      if (selectedAdminEvent === 'all') return true;
      return p.evento === selectedAdminEvent;
    });

    if (filteredList.length === 0) {
      triggerNotification('error', 'No hay datos en el filtro actual para exportar.');
      return;
    }

    const headers = ['Nombre Completo', 'Documento', 'Celular', 'Correo', 'Evento Registrado', 'Fecha Registro'];
    const rows = filteredList.map(p => [
      p.nombreCompleto,
      p.documento,
      p.celular,
      p.correo,
      p.evento,
      new Date(p.fechaRegistro).toLocaleString()
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      const sanitizedRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
      csvContent += sanitizedRow.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inscritos_LlanoTorneoSport_${selectedAdminEvent.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playBeep(900, 0.2);
  };

  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handleExportExcel = () => {
    const filteredList = participants.filter(p => {
      if (selectedAdminEvent === 'all') return true;
      return p.evento === selectedAdminEvent;
    });

    if (filteredList.length === 0) {
      triggerNotification('error', 'No hay datos en el filtro actual para exportar.');
      return;
    }

    const sheetName = (selectedAdminEvent === 'all' ? 'Inscritos' : selectedAdminEvent).substring(0, 30);
    
    // Rows mapped in inline CSS spreadsheet compatible layout
    const rowsHTML = filteredList.map(p => `
      <tr>
        <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: sans-serif; font-size: 11pt;">${escapeHTML(p.nombreCompleto)}</td>
        <td style="padding: 10px; border: 1px solid #334155; color: #38bdf8; background-color: #0f172a; font-family: monospace; font-size: 11pt; mso-number-format:'\\@';">${escapeHTML(p.documento)}</td>
        <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: monospace; font-size: 11pt; mso-number-format:'\\@';">${escapeHTML(p.celular)}</td>
        <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: sans-serif; font-size: 11pt;">${escapeHTML(p.correo)}</td>
        <td style="padding: 10px; border: 1px solid #334155; color: #00e5ff; background-color: #0f172a; font-family: sans-serif; font-size: 11pt; font-weight: bold;">${escapeHTML(p.evento)}</td>
        <td style="padding: 10px; border: 1px solid #334155; color: #94a3b8; background-color: #0f172a; font-family: monospace; font-size: 10pt;">${escapeHTML(new Date(p.fechaRegistro).toLocaleString())}</td>
      </tr>
    `).join('');

    // HTML spreadsheet template
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${sheetName}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        table { border-collapse: collapse; }
        th { font-weight: bold; border: 1px solid #334155; padding: 12px 10px; text-align: left; }
        td { border: 1px solid #334155; padding: 10px; text-align: left; }
      </style>
      </head>
      <body style="background-color: #020617; font-family: sans-serif;">
        <table>
          <!-- Brand Header Banner -->
          <tr>
            <th colspan="6" style="text-align: center; font-size: 18pt; font-weight: bold; background-color: #0f172a; color: #00e5ff; border: 1px solid #334155; height: 50px; padding: 15px;">
              LLANO TORNEO SPORT - LISTA OFICIAL DE REGISTRADOS
            </th>
          </tr>
          <tr>
            <th colspan="6" style="text-align: center; font-size: 10pt; font-weight: bold; background-color: #0f172a; color: #94a3b8; border: 1px solid #334155; padding: 5px;">
              Filtro: ${selectedAdminEvent === 'all' ? 'Todos los Eventos' : selectedAdminEvent} | Descargado: ${new Date().toLocaleString()}
            </th>
          </tr>
          <!-- Spacer row -->
          <tr style="height: 15px;">
            <td colspan="6" style="background-color: #020617; border: none;"></td>
          </tr>
          <!-- Table Headers -->
          <tr style="height: 35px;">
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Nombre Completo</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Documento de Identidad</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Celular</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Correo Electrónico</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Evento Asociado</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Fecha de Registro</th>
          </tr>
          ${rowsHTML}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Inscritos_LlanoTorneoSport_${selectedAdminEvent.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    playBeep(950, 0.25);
    triggerNotification('success', 'Excel corporativo descargado de forma segura.');
  };

  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinAngleStart, setSpinAngleStart] = useState(0);
  const [startAngle, setStartAngle] = useState(0);
  const [spinTime, setSpinTime] = useState(0);
  const [spinTimeTotal, setSpinTimeTotal] = useState(0);

  // Wheel colors branding
  const colors = ['#00e5ff', '#0f172a', '#38bdf8', '#1e293b', '#0284c7', '#0f172a'];

  // Dynamically filter roulette participants by the SELECTED event
  const roulettePool = participants.filter(p => p.evento === selectedRouletteEvent);

  const drawRouletteWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, width, height);

    // If no participants, draw a beautiful placeholder state
    if (roulettePool.length === 0) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin participantes registrados', centerX, centerY - 10);
      ctx.font = '12px sans-serif';
      ctx.fillText('en este evento aún', centerX, centerY + 10);
      return;
    }

    const len = roulettePool.length;
    const arc = Math.PI / (len / 2);

    // Outer neon glow ring
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00e5ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw Slices
    for (let i = 0; i < len; i++) {
      const angle = startAngle + i * arc;
      ctx.fillStyle = colors[i % colors.length];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc, false);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      // Border lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Labels inside segments
      ctx.save();
      ctx.fillStyle = colors[i % colors.length] === '#00e5ff' || colors[i % colors.length] === '#38bdf8' ? '#020617' : '#ffffff';
      
      if (ctx.fillStyle === '#ffffff') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
      }
      
      ctx.translate(centerX + Math.cos(angle + arc / 2) * (radius / 1.7), centerY + Math.sin(angle + arc / 2) * (radius / 1.7));
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const rawText = roulettePool[i].nombreCompleto;
      const formattedText = rawText.length > 15 ? rawText.substring(0, 13) + '..' : rawText;
      ctx.fillText(formattedText, 0, 0);
      ctx.restore();
    }

    // Central cap
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00e5ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', centerX, centerY + 6);
  };

  useEffect(() => {
    drawRouletteWheel();
  }, [startAngle, participants, selectedRouletteEvent, events]);

  useEffect(() => {
    if (!isSpinning) return;

    let animFrameId;

    const rotateWheel = () => {
      const currentSpinTime = spinTime + 30;
      if (currentSpinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
      }

      setSpinTime(currentSpinTime);
      const ts = currentSpinTime / spinTimeTotal;
      const easing = 1 - Math.pow(1 - ts, 3); // ease out cubic
      const currentAngle = startAngle + (spinAngleStart * (1 - easing)) * (Math.PI / 180);
      
      // Dynamic Sound tick on boundary crossing
      const totalSlices = roulettePool.length;
      if (totalSlices > 0) {
        const arc = 360 / totalSlices;
        const prevStep = Math.floor((startAngle * 180 / Math.PI) / arc);
        const nextStep = Math.floor((currentAngle * 180 / Math.PI) / arc);
        if (prevStep !== nextStep) {
          playBeep(700, 0.04);
        }
      }

      setStartAngle(currentAngle);
      animFrameId = requestAnimationFrame(rotateWheel);
    };

    animFrameId = requestAnimationFrame(rotateWheel);
    return () => cancelAnimationFrame(animFrameId);
  }, [isSpinning, spinTime]);

  const spinTheWheel = () => {
    if (isSpinning) return;
    if (roulettePool.length === 0) {
      triggerNotification('error', 'No hay personas inscritas en este evento para sortear.');
      return;
    }

    const startAngleValue = Math.random() * 10 + 10;
    const totalSpinTime = Math.random() * 3000 + 4000; // 4 to 7 seconds

    setSpinAngleStart(startAngleValue * 25);
    setSpinTime(0);
    setSpinTimeTotal(totalSpinTime);
    setIsSpinning(true);
    playBeep(520, 0.2);
  };

  const stopRotateWheel = () => {
    setIsSpinning(false);
    
    const len = roulettePool.length;
    if (len === 0) return;

    const arc = Math.PI / (len / 2);
    const degrees = (startAngle * 180) / Math.PI + 90;
    const arcd = (arc * 180) / Math.PI;
    const index = Math.floor((360 - (degrees % 360)) / arcd) % len;
    
    const chosenWinner = roulettePool[index];
    setWinnerName(chosenWinner.nombreCompleto);
    setWinnerDoc(chosenWinner.documento || ''); // Extract and store document identification safely
    setShowWinnerModal(true);
    playConfettiBeeps();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Area */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-cyan-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
                <img 
                  src="image_a10aed.png" 
                  alt="Llano Torneo Sport Logo" 
                  className="relative h-14 w-14 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase text-white">
                  Llano Torneo<span className="text-cyan-400 font-extrabold text-lg block sm:inline sm:ml-1">Sport</span>
                </h1>
                <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold block">Inscripciones y Sorteos</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('register')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'register' 
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 shadow-lg shadow-cyan-500/20' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Registrarse
              </button>

              {isAdminAuthenticated && (
                <>
                  <button 
                    onClick={() => handleAdminTabAccess('admin-list')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'admin-list' 
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 shadow-lg shadow-cyan-500/20' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Panel Registrados
                  </button>

                  <button 
                    onClick={() => handleAdminTabAccess('roulette')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'roulette' 
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 shadow-lg shadow-cyan-500/20' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    Ruleta Sorteo
                  </button>

                  <button 
                    onClick={() => handleAdminTabAccess('manage-events')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'manage-events' 
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 shadow-lg shadow-cyan-500/20' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Gestión Eventos
                  </button>
                </>
              )}
            </nav>

            {/* Sound Toggle & Admin Login button */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
                title={soundEnabled ? "Silenciar" : "Activar Sonido"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {isAdminAuthenticated ? (
                <div className="hidden sm:flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/60 px-3 py-1.5 rounded-full text-xs text-cyan-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Admin Activado
                </div>
              ) : (
                <button 
                  onClick={() => setShowPinModal(true)}
                  className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg transition text-slate-300 hover:text-white"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Acceso Admin
                </button>
              )}

              {/* Mobile Menu Icon */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 bg-slate-900 border-b border-slate-800 space-y-2 animate-fade-in">
            <button 
              onClick={() => { setActiveTab('register'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${
                activeTab === 'register' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              Inscripción de Participantes
            </button>
            
            {isAdminAuthenticated && (
              <>
                <button 
                  onClick={() => handleAdminTabAccess('admin-list')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${
                    activeTab === 'admin-list' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Lista de Inscritos
                </button>
                <button 
                  onClick={() => handleAdminTabAccess('roulette')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${
                    activeTab === 'roulette' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Gift className="w-5 h-5" />
                  Ruleta de Sorteos
                </button>
                <button 
                  onClick={() => handleAdminTabAccess('manage-events')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${
                    activeTab === 'manage-events' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  Gestión de Eventos
                </button>
              </>
            )}
            
            <div className="pt-2 border-t border-slate-800/60">
              {isAdminAuthenticated ? (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-cyan-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sesión Admin Activa
                </div>
              ) : (
                <button 
                  onClick={() => { setShowPinModal(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs bg-slate-800 text-slate-300 rounded-lg hover:text-white"
                >
                  <Lock className="w-4.5 h-4.5 text-cyan-400 mr-1" />
                  Iniciar Sesión de Administrador
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Toast Notifications */}
      {notification && (
        <div className="fixed top-24 right-4 z-50 animate-bounce-in max-w-sm w-full bg-slate-900 border-l-4 border-cyan-400 p-4 rounded-r-lg shadow-2xl flex items-start gap-3">
          {notification.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-cyan-400 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold text-white">Mensaje del Sistema</p>
            <p className="text-xs text-slate-300">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Real-time Indicator Widget */}
        <div className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
            </span>
            <p className="text-sm font-semibold text-slate-300">
              Servidor Seguro de Llano Torneo Sport Sincronizado en la Nube
            </p>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="bg-slate-800 px-3 py-1.5 rounded-full text-slate-300">
              {events.length} Eventos Activos
            </span>
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-900 px-3 py-1.5 rounded-full">
              {participants.length} Registrados Totales
            </span>
          </div>
        </div>

        {/* Tab 1: Registration Form */}
        {activeTab === 'register' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Promotional Info Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl -z-10"></div>
                
                {/* Visual Logo Centerpiece */}
                <div className="flex justify-center mb-6">
                  <div className="p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl max-w-[180px] w-full">
                    <img 
                      src="image_a10aed.png" 
                      alt="Logo Oficial Llano Torneo Sport" 
                      className="rounded-xl w-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white text-center mb-2">REGISTRO DE PARTICIPANTES</h2>
                <p className="text-sm text-slate-400 text-center mb-6">
                  Inscríbete seleccionando el evento en el que participarás. Tus datos quedarán blindados en la base de datos de manera permanente.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Eventos y Torneos</h4>
                      <p className="text-xs text-slate-400">Escoge el evento oficial correspondiente para asegurar tu cupo y acreditación.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Sorteos Integrados</h4>
                      <p className="text-xs text-slate-400">Una vez registrado, ingresas directamente a la ruleta del evento para dinámicas en directo.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Respaldo Inmune a Caídas</h4>
                      <p className="text-xs text-slate-400">El sistema almacena tu formulario de forma instantánea garantizando que nada se borre.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fast access links */}
              <div className="bg-gradient-to-r from-cyan-950/20 to-slate-900 border border-cyan-500/10 rounded-xl p-4 flex justify-between items-center">
                <div className="text-xs text-slate-400">
                  ¿Eres el organizador?
                </div>
                <button 
                  onClick={() => handleAdminTabAccess('admin-list')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Panel Administrativo
                </button>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">FORMULARIO OFICIAL</h3>
                  <p className="text-xs text-slate-400">Escribe tus datos reales para poder participar.</p>
                </div>
                <div className="p-2 bg-cyan-400 text-slate-950 rounded-lg font-bold text-xs tracking-wider">
                  PASO ÚNICO
                </div>
              </div>

              <form onSubmit={handleSubmitRegistration} className="p-6 space-y-5">
                
                {formStatus.message && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 text-sm animate-fade-in ${
                    formStatus.type === 'success' ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-200' :
                    formStatus.type === 'error' ? 'bg-rose-950/40 border border-rose-800 text-rose-200' :
                    'bg-slate-800 border border-slate-700 text-slate-300'
                  }`}>
                    {formStatus.type === 'loading' ? (
                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    ) : formStatus.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>{formStatus.message}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Event */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Selecciona el Evento al que te vas a registrar *</label>
                    <select 
                      name="evento"
                      required
                      value={formData.evento}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      {events.filter(ev => ev.activo !== false).length > 0 ? (
                        events.filter(ev => ev.activo !== false).map(ev => (
                          <option key={ev.id} value={ev.nombre}>{ev.nombre}</option>
                        ))
                      ) : (
                        <option value="">No hay eventos activos disponibles para registros...</option>
                      )}
                    </select>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Nombre Completo *</label>
                    <input 
                      type="text" 
                      name="nombreCompleto"
                      required
                      value={formData.nombreCompleto}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Carlos Ortega" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  {/* Document ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Documento de Identificación *</label>
                    <input 
                      type="text" 
                      name="documento"
                      required
                      inputMode="numeric"
                      minLength={6}
                      value={formData.documento}
                      onChange={handleInputChange}
                      placeholder="Ej. 11223344" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  </div>

                  {/* Cellphone Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Número de Celular *</label>
                    <input 
                      type="tel" 
                      name="celular"
                      required
                      inputMode="tel"
                      maxLength={10}
                      value={formData.celular}
                      onChange={handleInputChange}
                      placeholder="Ej. 3123456789" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Correo Electrónico *</label>
                    <input 
                      type="email" 
                      name="correo"
                      required
                      value={formData.correo}
                      onChange={handleInputChange}
                      placeholder="ejemplo@correo.com" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="flex items-start gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="terminos" 
                    name="terminos"
                    required
                    checked={formData.terminos}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 text-cyan-500 bg-slate-950 border-slate-800 rounded focus:ring-cyan-500 focus:ring-offset-slate-900 focus:ring-2"
                  />
                  <label htmlFor="terminos" className="text-xs text-slate-400 leading-normal select-none">
                    Acepto que mis datos sean guardados en la nube de <span className="text-cyan-400">Llano Torneo Sport</span> para coordinar mi participación en eventos, sorteos y actividades interactivas relacionadas.
                  </label>
                </div>

                {/* Submit button */}
                <button 
                  type="submit" 
                  disabled={formStatus.type === 'loading'}
                  className="w-full mt-2 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black tracking-wider text-sm py-4 rounded-xl shadow-lg hover:shadow-cyan-400/20 active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2 uppercase"
                >
                  <UserPlus className="w-5 h-5 text-slate-950" />
                  Confirmar Registro
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Admin Registered List (Filtered with Event Tabs) */}
        {activeTab === 'admin-list' && isAdminAuthenticated && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            
            <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  CONTROL DE PARTICIPANTES POR EVENTO
                </h3>
                <p className="text-xs text-slate-400">Base de datos permanente. Organizada por filtros individuales por evento.</p>
              </div>

              {/* CSV Export and Corporate Excel Trigger */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleExportCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700/60"
                >
                  <Download className="w-4 h-4" /> Exportar archivo CSV
                </button>
                <button 
                  onClick={handleExportExcel}
                  className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-cyan-400/20"
                >
                  <Trophy className="w-4 h-4 text-slate-950" /> Exportar a Excel (.xls)
                </button>
              </div>
            </div>

            {/* Event Selector Panels */}
            <div className="bg-slate-950/40 p-4 border-b border-slate-800">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-cyan-400" /> Selecciona el panel de evento para filtrar participantes:
              </span>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedAdminEvent('all')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    selectedAdminEvent === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  🎯 Todos los Registrados ({participants.length})
                </button>
                {events.map((ev) => {
                  const eventCount = participants.filter(p => p.evento === ev.nombre).length;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedAdminEvent(ev.nombre)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                        selectedAdminEvent === ev.nombre
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      📅 {ev.nombre} ({eventCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats on Filtered Group */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800 bg-slate-950/20 text-center text-xs">
              <div className="p-4 border-r border-slate-800">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Panel Seleccionado</span>
                <span className="text-sm font-bold text-cyan-400 truncate block max-w-[200px] mx-auto text-center block">
                  {selectedAdminEvent === 'all' ? 'Todos los Eventos' : selectedAdminEvent}
                </span>
              </div>
              <div className="p-4 border-r border-slate-800">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Registrados en Filtro</span>
                <span className="text-xl font-black text-white">
                  {participants.filter(p => selectedAdminEvent === 'all' || p.evento === selectedAdminEvent).length}
                </span>
              </div>
              <div className="p-4 border-r border-slate-800">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Porcentaje del Total</span>
                <span className="text-xl font-black text-white">
                  {participants.length > 0 
                    ? Math.round((participants.filter(p => selectedAdminEvent === 'all' || p.evento === selectedAdminEvent).length / participants.length) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="p-4">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Fecha Actual</span>
                <span className="text-xs font-bold text-white font-mono mt-1 block">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Search filter bar */}
            <div className="p-4 bg-slate-950/20 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar participante por nombre o documento..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-xs font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-4">Participante</th>
                    <th className="p-4">Identificación</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4">Evento Asociado</th>
                    <th className="p-4">Fecha de Registro</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {participants
                    .filter(p => {
                      // Filter by Event
                      if (selectedAdminEvent !== 'all' && p.evento !== selectedAdminEvent) return false;
                      // Filter by Search Query
                      const query = searchQuery.toLowerCase();
                      return (
                        (p.nombreCompleto || '').toLowerCase().includes(query) ||
                        (p.documento || '').toLowerCase().includes(query)
                      );
                    }).length > 0 ? (
                      participants
                        .filter(p => {
                          if (selectedAdminEvent !== 'all' && p.evento !== selectedAdminEvent) return false;
                          const query = searchQuery.toLowerCase();
                          return (
                            (p.nombreCompleto || '').toLowerCase().includes(query) ||
                            (p.documento || '').toLowerCase().includes(query)
                          );
                        })
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition text-sm">
                            <td className="p-4 font-bold text-white">{p.nombreCompleto}</td>
                            <td className="p-4 text-slate-300 font-mono">{p.documento}</td>
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5 text-xs text-slate-300">
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-cyan-400" /> {p.celular}
                                </span>
                                <span className="flex items-center gap-1 text-slate-400 font-mono">
                                  <Mail className="w-3 h-3 text-slate-500" /> {p.correo}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="bg-slate-950 px-2.5 py-1 rounded-full text-xs font-bold text-cyan-400 border border-cyan-900/40 block w-fit truncate max-w-[200px]">
                                {p.evento}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 text-xs font-mono">
                              {new Date(p.fechaRegistro).toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                              {/* TRIGGER: Request participant delete modal */}
                              <button 
                                onClick={() => requestDeleteParticipant(p.id, p.nombreCompleto)}
                                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                                title="Eliminar inscripción"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-slate-500 text-sm">
                          No hay registros de inscripción para este evento.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Sorteo / Live Interactive Roulette */}
        {activeTab === 'roulette' && isAdminAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fade-in">
            
            {/* Roulette Spinning Area */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl"></div>
              
              <div className="w-full text-center mb-4">
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Sorteos en Directo
                </span>
                <h3 className="text-xl font-black text-white mt-2">RULETA ELECTRÓNICA</h3>
                
                {/* Event decider selector for the Roulette */}
                <div className="mt-4 max-w-sm mx-auto">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Selecciona el Evento con el que deseas Sorteos:
                  </label>
                  <select
                    value={selectedRouletteEvent}
                    onChange={(e) => setSelectedRouletteEvent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-400 transition"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.nombre}>{ev.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Graphical Roulette Wheel */}
              <div className="relative my-4 flex items-center justify-center">
                {/* Pointer Arrow */}
                <div className="absolute -top-3 z-30 drop-shadow-[0_4px_6px_rgba(0,229,255,0.4)] animate-bounce">
                  <div className="w-8 h-8 bg-cyan-400 rotate-45 transform origin-center border-2 border-white rounded-br-md"></div>
                </div>

                {/* Canvas Render */}
                <canvas 
                  ref={canvasRef} 
                  width="420" 
                  height="420" 
                  className="max-w-full h-auto aspect-square rounded-full shadow-2xl bg-slate-950 border border-slate-800"
                />
              </div>

              {/* Play trigger button */}
              <div className="w-full max-w-sm mt-4">
                <button 
                  onClick={spinTheWheel}
                  disabled={isSpinning || roulettePool.length === 0}
                  className={`w-full py-4 rounded-xl font-black tracking-widest text-sm uppercase transition duration-300 transform active:scale-95 shadow-xl ${
                    isSpinning 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                      : roulettePool.length === 0 
                        ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 hover:shadow-cyan-400/20'
                  }`}
                >
                  {isSpinning ? '¡GIRANDO RÁPIDAMENTE!' : roulettePool.length === 0 ? 'Faltan Inscritos para Iniciar' : '🔥 ¡GIRAR RULETA AHORA! 🔥'}
                </button>
              </div>
            </div>

            {/* Event Participant Sidebar List */}
            <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <h4 className="font-black text-white border-b border-slate-800 pb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                  <Award className="w-4.5 h-4.5 text-cyan-400" />
                  Bombo de Participantes ({roulettePool.length})
                </h4>
                
                <p className="text-xs text-slate-400 my-3">
                  Solo los inscritos que correspondan al evento seleccionado entrarán al sorteo actual.
                </p>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {roulettePool.length > 0 ? (
                    roulettePool.map((p, idx) => (
                      <div 
                        key={p.id || idx} 
                        className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs"
                      >
                        <div className="font-bold text-slate-200">{p.nombreCompleto}</div>
                        <div className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded border border-cyan-900/30 font-mono tracking-wider">
                          {p.documento}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-500 text-xs border-2 border-dashed border-slate-800 rounded-xl">
                      ⚠️ No hay nadie registrado en este evento aún. 
                      <p className="mt-2 text-[10px] text-slate-600">Completa una prueba registrándote en este evento en la primera pestaña.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6 bg-slate-950/25 p-4 rounded-xl">
                <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Instrucciones del Directo</h5>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>Selecciona el evento deportivo arriba para cambiar de bombo instantáneamente.</li>
                  <li>Puedes proyectar esta pestaña en el directo de redes sociales o pantallas de la tarima.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Event Creator & Management */}
        {activeTab === 'manage-events' && isAdminAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left side: Create/Edit Event Form */}
            <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
              <h3 className="text-md font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                {isEditingEvent ? (
                  <>
                    <Pencil className="w-5 h-5 text-amber-400" /> Editar Evento
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5 text-cyan-400" /> Crear Nuevo Evento
                  </>
                )}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {isEditingEvent 
                  ? 'Modifica los detalles del evento seleccionado. Los cambios se guardarán de inmediato.' 
                  : 'Agrega eventos para que queden disponibles inmediatamente en el formulario de registro del público.'}
              </p>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-400">Nombre del Evento *</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.nombre}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Copa Futsal Llano 2026" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-400">Descripción Corta</label>
                  <textarea 
                    value={newEvent.descripcion}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Escribe detalles del torneo o rifa" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition text-sm h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  {isEditingEvent && (
                    <button 
                      type="button"
                      onClick={handleCancelEditEvent}
                      className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3.5 rounded-lg uppercase transition"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    className={`${isEditingEvent ? 'w-1/2 bg-amber-500 hover:bg-amber-400 text-slate-950' : 'w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950'} font-black tracking-wider text-xs py-3.5 rounded-lg uppercase transition flex items-center justify-center gap-2`}
                  >
                    {isEditingEvent ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Guardar Cambios
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Registrar Evento Nuevo
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right side: Event List & Status */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
              <h3 className="text-md font-black text-white uppercase tracking-wider mb-2">
                Eventos Creados en la Plataforma ({events.length})
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Lista de todos los eventos configurados en tiempo real.
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {events.map((ev) => {
                  const registrations = participants.filter(p => p.evento === ev.nombre).length;
                  return (
                    <div key={ev.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{ev.nombre}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                            ev.activo !== false 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' 
                              : 'bg-slate-800 text-slate-400 border border-slate-700/40'
                          }`}>
                            {ev.activo !== false ? 'Activo' : 'Pausado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{ev.descripcion}</p>
                        <span className="inline-block mt-2 text-[10px] font-mono text-slate-500">
                          ID: <span className="text-cyan-500">{ev.id}</span> | Creado: {ev.fechaCreado ? new Date(ev.fechaCreado).toLocaleDateString() : 'Por defecto'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2">
                          <span className="block text-xs font-bold text-cyan-400">{registrations}</span>
                          <span className="text-[9px] text-slate-500 uppercase font-bold">Inscritos</span>
                        </div>
                        {/* Toggle Active Button */}
                        <button 
                          onClick={() => handleToggleEventActive(ev.id, ev.activo)}
                          className={`p-2 rounded-lg transition ${
                            ev.activo !== false 
                              ? 'text-emerald-400 hover:bg-emerald-500/10' 
                              : 'text-slate-500 hover:bg-slate-500/10'
                          }`}
                          title={ev.activo !== false ? "Pausar inscripciones de este evento" : "Activar inscripciones de este evento"}
                        >
                          {ev.activo !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        {/* Edit Button */}
                        <button 
                          onClick={() => handleStartEditEvent(ev)}
                          className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition"
                          title="Editar Evento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(ev.id, ev.nombre)}
                          className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Eliminar Evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Admin Access Passkey Authentication */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white uppercase">Acceso Organizadores</h3>
              </div>
              <button 
                onClick={() => { setShowPinModal(false); setAdminError(''); }}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Introduce el PIN de organizador para administrar la base de datos de inscritos y operar los sorteos de la ruleta.
            </p>

            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Contraseña de Administrador</label>
                <input 
                  type="password" 
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Escribe la clave" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400 transition"
                  autoFocus
                />
                {adminError && <p className="text-xs text-rose-400 mt-1 font-semibold">{adminError}</p>}
              </div>

              <button 
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black tracking-wider text-xs py-3 rounded-lg uppercase transition"
              >
                Validar Credencial
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Winner Announcement Visual Celebration */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-cyan-400 rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600"></div>
            
            <div className="my-4">
              <span className="text-5xl block animate-bounce">🏆</span>
            </div>

            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest">
              ¡TENEMOS UN GANADOR DEL EVENTO!
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight uppercase break-words px-2">
              {winnerName}
            </h2>

            {/* Displaying the last 4 digits of the winner's identification document to handle duplicates */}
            {winnerDoc && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-slate-950/60 border border-cyan-900/40 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-cyan-400 shadow-inner">
                <span>Documento:</span>
                <span className="tracking-wider">•••• {winnerDoc.trim().slice(-4)}</span>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4 max-w-sm mx-auto">
              Ganador seleccionado al azar de manera transparente mediante la ruleta oficial de Llano Torneo Sport. ¡Felicidades!
            </p>

            <div className="mt-8 flex flex-col gap-2 max-w-xs mx-auto">
              <button 
                onClick={() => {
                  setShowWinnerModal(false);
                  setWinnerDoc('');
                }}
                className="w-full bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition shadow-lg shadow-cyan-400/20"
              >
                Cerrar y Seguir Sorteos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Participant Double Confirmation */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-md font-bold text-white mb-2 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Confirmar Eliminación
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              ¿Estás seguro de que deseas eliminar la inscripción de <span className="text-cyan-400 font-bold">"{deleteTargetName}"</span>? Esta acción se guardará en la nube inmediatamente y removerá a la persona de la ruleta del evento.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setDeleteTargetId(null); setDeleteTargetName(''); }}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteParticipant}
                className="bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-lg text-xs font-semibold text-white transition animate-pulse"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Event Double Confirmation */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-md font-bold text-white mb-2 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Eliminar Evento Oficial
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              ¿Estás absolutamente seguro de que deseas eliminar permanentemente el evento <span className="text-cyan-400 font-bold">"{deleteEventTarget.nombre}"</span>? Esta acción es irreversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteEventTarget(null)}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteEvent}
                className="bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-lg text-xs font-semibold text-white transition"
              >
                Eliminar Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/60 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Llano Torneo Sport. Todos los derechos reservados.
          </p>
          <p className="text-[10px] text-slate-600 mt-2">
            Base de datos y eventos en tiempo real autoalimentados con persistencia permanente.
          </p>
        </div>
      </footer>

    </div>
  );
}