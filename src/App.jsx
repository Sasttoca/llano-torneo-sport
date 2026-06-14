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
  deleteDoc, 
  onSnapshot,
  setDoc,
  getDoc,
  getDocs
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
  EyeOff,
  Sparkles,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw
} from 'lucide-react';

// Configuración de Firebase con tolerancia a entornos de prueba locales
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

// Eventos predeterminados con balance de categorías para la base de datos inicial
const DEFAULT_EVENTS = [
  { id: 'default-1', nombre: 'Sorteo de Bienvenida Llano Torneo Sport 2026', descripcion: 'Sorteo general para todos los nuevos participantes deportivos.', activo: true, categoria: 'sport' },
  { id: 'default-2', nombre: 'Gran Sorteo Integración Deportiva', descripcion: 'Sorteo especial del torneo de integración de fútbol.', activo: true, categoria: 'sport' },
  { id: 'default-3', nombre: 'Gran Campeonato EA Sports FC 26 - Llano Gaming', descripcion: 'Torneo virtual de fútbol para la consola de nueva generación.', activo: true, categoria: 'gaming' },
  { id: 'default-4', nombre: 'Rifa de Clausura de Torneos Gaming', descripcion: 'Evento de cierre con increíbles premios para apasionados del gaming.', activo: true, categoria: 'gaming' }
];

// Patrocinadores predeterminados para evitar bloqueos del sponsor-gate al iniciar por primera vez
const DEFAULT_SPONSORS = [
  { id: 'default-sponsor-1', nombre: 'Gatorade Meta', enlace: 'https://gatorade.com', vinculacion: 'all', eventosIds: [] },
  { id: 'default-sponsor-2', nombre: 'Llanero Gaming Store', enlace: 'https://instagram.com', vinculacion: 'all', eventosIds: [] },
  { id: 'default-sponsor-3', nombre: 'Indeportes Meta', enlace: 'https://www.meta.gov.co', vinculacion: 'all', eventosIds: [] }
];

// Helper para sanitizar strings en el Excel corporativo
const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
};

// Diccionario estático de estilos para la doble marca
const brandStyles = {
  sport: {
    textAccent: 'text-cyan-400',
    textAccentHover: 'hover:text-cyan-300',
    borderAccent: 'border-cyan-400',
    borderAccentHover: 'hover:border-cyan-300',
    focusBorderAccent: 'focus:border-cyan-400',
    focusRingAccent: 'focus:ring-cyan-500',
    bgAccent: 'bg-cyan-500',
    bgAccentLight: 'bg-cyan-950/40',
    borderAccentLight: 'border-cyan-900/40',
    gradient: 'from-cyan-400 to-sky-500',
    hoverGradient: 'hover:from-cyan-300 hover:to-sky-400',
    shadowAccent: 'shadow-cyan-400/20',
    primaryRaw: '#22d3ee', // Cyan de referencia para la Ruleta en Canvas
    logo: 'logoSport.png', // Balón de Fútbol profesional
    title: 'Sport',
    titleColor: 'text-cyan-400',
    glowBg: 'bg-cyan-500/10',
    textAccentLight: 'text-cyan-400',
    ringColor: 'focus:ring-cyan-500',
    bulletAccent: 'text-cyan-400'
  },
  gaming: {
    textAccent: 'text-red-500',
    textAccentHover: 'hover:text-red-400',
    borderAccent: 'border-red-500',
    borderAccentHover: 'hover:border-red-400',
    focusBorderAccent: 'focus:border-red-500',
    focusRingAccent: 'focus:ring-red-500',
    bgAccent: 'bg-red-500',
    bgAccentLight: 'bg-red-950/40',
    borderAccentLight: 'border-red-900/40',
    gradient: 'from-red-500 to-rose-600',
    hoverGradient: 'hover:from-red-400 hover:to-rose-500',
    shadowAccent: 'shadow-red-500/20',
    primaryRaw: '#ef4444', // Rojo de referencia para la Ruleta en Canvas
    logo: 'LogoGaming.png', // Consola de mandos de juego
    title: 'Gaming',
    titleColor: 'text-red-500',
    glowBg: 'bg-red-500/10',
    textAccentLight: 'text-red-400',
    ringColor: 'focus:ring-red-500',
    bulletAccent: 'text-red-500'
  }
};

export default function App() {
  // --- ESTADOS DE PATROCINADORES ---
  const [showSponsorsModal, setShowSponsorsModal] = useState(false);
  const [followedSponsors, setFollowedSponsors] = useState([]);
  const [sponsorsList, setSponsorsList] = useState([]); 
  
  // Estado para el administrador (Nombre, Enlace, Tipo de Vinculación y Eventos Asociados)
  const [newSponsor, setNewSponsor] = useState({ 
    nombre: '', 
    enlace: '', 
    vinculacion: 'all', 
    eventosIds: [] 
  });
  const [isEditingSponsor, setIsEditingSponsor] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState(null);

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'admin-list', 'roulette', 'manage-events', 'sponsors'
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

  // --- NUEVOS ESTADOS DE ARQUITECTURA BAJO DEMANDA (PULL) ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // --- ESTADOS PARA GESTIÓN DE SORTEO PERSISTENTE EN LA NUBE ---
  const [sorteoActive, setSorteoActive] = useState(false);
  const [sorteoCandidates, setSorteoCandidates] = useState([]);
  const [sorteoWinners, setSorteoWinners] = useState([]);
  const [isSyncingSorteo, setIsSyncingSorteo] = useState(false);

  // --- ESTADOS DE PAGINACIÓN OPTIMIZADA (CLIENT-SIDE) ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Formulario de Eventos
  const [newEvent, setNewEvent] = useState({ nombre: '', descripcion: '', categoria: 'sport' });
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Formulario de Participantes
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documento: '',
    edad: '',
    ciudadResidencia: '',
    celular: '',
    correo: '',
    evento: '', 
    terminos: false
  });
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });

  // Estados de modals y notificaciones de eliminación
  const [notification, setNotification] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [deleteEventTarget, setDeleteEventTarget] = useState(null); 
  const [deleteSponsorTarget, setDeleteSponsorTarget] = useState(null); 
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  const [winnerDoc, setWinnerDoc] = useState(''); 

  // Estado para simular visualización de nombres durante el giro rápido (ruleta masiva)
  const [cyclingName, setCyclingName] = useState('');

  // Determinar la marca correspondiente de un evento dado su nombre
  const getEventBrand = (eventName) => {
    const ev = events.find(e => e.nombre === eventName);
    return ev?.categoria === 'gaming' ? 'gaming' : 'sport';
  };

  // Calcular la marca activa según la pestaña y la selección actual para vestir la UI
  let activeBrand = 'sport';
  if (activeTab === 'register') {
    activeBrand = getEventBrand(formData.evento);
  } else if (activeTab === 'roulette') {
    activeBrand = getEventBrand(selectedRouletteEvent);
  } else if (activeTab === 'admin-list') {
    activeBrand = selectedAdminEvent === 'all' ? 'sport' : getEventBrand(selectedAdminEvent);
  }
  const activeBrandStyles = brandStyles[activeBrand] || brandStyles.sport;

  // Filtrar patrocinadores válidos según el evento elegido en el formulario de registro
  const currentRegEvent = events.find(ev => ev.nombre === formData.evento);
  const currentRegEventId = currentRegEvent?.id;
  const filteredSponsorsForRegister = sponsorsList.filter(sponsor => {
    if (!sponsor.vinculacion || sponsor.vinculacion === 'all') return true;
    if (sponsor.vinculacion === 'custom' && sponsor.eventosIds && sponsor.eventosIds.includes(currentRegEventId)) return true;
    if (sponsor.eventoId === currentRegEventId) return true;
    return false;
  });

  // Habilitar si ya siguió todos los patrocinadores vinculados al evento actual
  const allSponsorsFollowed = filteredSponsorsForRegister.length === 0 || 
    filteredSponsorsForRegister.every(sponsor => followedSponsors.includes(sponsor.id));

  const handleFollowClick = (id, url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!followedSponsors.includes(id)) {
      setFollowedSponsors(prev => [...prev, id]);
    }
  };

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
      // Ignorar bloqueos de simulación de audio de navegadores
    }
  };

  const playConfettiBeeps = () => {
    if (!soundEnabled) return;
    let count = 0;
    const interval = setInterval(() => {
      playBeep(520 + count * 100, 0.15);
      count++;
      if (count > 6) clearInterval(interval);
    }, 100);
  };

  // --- INICIALIZACIÓN DE FIREBASE Y AUTHENTICATION ---
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

  // --- ESCUCHA DE EVENTOS Y PATROCINADORES (REAL-TIME BAJA CONCURRENCIA) ---
  useEffect(() => {
    if (!user) return;

    const eventsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');

    const unsubscribeEvents = onSnapshot(
      eventsCollectionRef,
      async (snapshot) => {
        let list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });

        if (list.length === 0) {
          for (const item of DEFAULT_EVENTS) {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', item.id);
            await setDoc(docRef, { 
              nombre: item.nombre, 
              descripcion: item.descripcion, 
              fechaCreado: Date.now(), 
              activo: true,
              categoria: item.categoria
            });
          }
        } else {
          list.sort((a, b) => (b.fechaCreado || 0) - (a.fechaCreado || 0));
          setEvents(list);
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

    const sponsorsRef = collection(db, 'artifacts', appId, 'public', 'data', 'patrocinadores');
    const unsubscribeSponsors = onSnapshot(
      sponsorsRef,
      async (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        
        if (list.length === 0) {
          for (const item of DEFAULT_SPONSORS) {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'patrocinadores', item.id);
            await setDoc(docRef, {
              nombre: item.nombre,
              enlace: item.enlace,
              vinculacion: item.vinculacion || 'all',
              eventosIds: item.eventosIds || [],
              creadoEn: Date.now()
            });
          }
        } else {
          setSponsorsList(list);
        }
      },
      (error) => console.error("Error al sincronizar patrocinadores: ", error)
    );

    return () => {
      unsubscribeEvents();
      unsubscribeSponsors();
    };
  }, [user]);

  // --- SOLUCIÓN MEJORA A: IMPLEMENTACIÓN DE FUNCIÓN DE SINCRONIZACIÓN BAJO DEMANDA (PULL) ---
  const syncParticipants = async () => {
    if (!user || !isAdminAuthenticated) return;
    setIsSyncing(true);
    try {
      const participantsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'registrados');
      const snapshot = await getDocs(participantsCollectionRef);
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => (b.fechaRegistro || 0) - (a.fechaRegistro || 0));
      setParticipants(list);
      setLastSyncTime(new Date());
      triggerNotification('success', 'Participantes actualizados correctamente.');
    } catch (error) {
      console.error("Pull de Firestore falló: ", error);
      triggerNotification('error', 'Error al consultar la base de datos de inscritos.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull automático cuando el administrador entra a una pestaña de consulta de datos por primera vez
  useEffect(() => {
    const needsSync = isAdminAuthenticated && (activeTab === 'admin-list' || activeTab === 'roulette');
    if (needsSync && participants.length === 0 && !isSyncing) {
      syncParticipants();
    }
  }, [activeTab, isAdminAuthenticated]);

  // --- SOLUCIÓN MEJORA B: PERSISTENCIA DEL ESTADO DEL SORTEO EN FIRESTORE ---
  const fetchSorteoProgreso = async () => {
    if (!user || !selectedRouletteEvent || !isAdminAuthenticated) return;
    setIsSyncingSorteo(true);
    try {
      const progressCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'sorteo_progreso');
      const snapshot = await getDocs(progressCollectionRef);
      const allProgress = [];
      snapshot.forEach((doc) => {
        allProgress.push({ id: doc.id, ...doc.data() });
      });

      // Filtrado y ordenamiento en memoria (RULE 2: Sin queries complejas)
      const filteredWinners = allProgress
        .filter(w => w.evento === selectedRouletteEvent)
        .sort((a, b) => (a.fechaGanado || 0) - (b.fechaGanado || 0));

      setSorteoWinners(filteredWinners);

      // Si ya existen ganadores guardados en la nube, autorestauramos la sesión sorteoActive en tarima
      if (filteredWinners.length > 0) {
        setSorteoActive(true);
        const remaining = roulettePool.filter(p => !filteredWinners.some(w => w.id === p.id));
        setSorteoCandidates(remaining);
      } else if (sorteoActive) {
        // Si no hay ganadores en la nube pero la UI está activa, reiniciamos el pool con el total actual
        setSorteoCandidates([...roulettePool]);
      }
    } catch (err) {
      console.error("Error cargando progreso del sorteo de Firestore: ", err);
    } finally {
      setIsSyncingSorteo(false);
    }
  };

  // Sincronizar el progreso del sorteo cuando el administrador cambia de evento en la ruleta
  useEffect(() => {
    if (isAdminAuthenticated && activeTab === 'roulette' && selectedRouletteEvent) {
      fetchSorteoProgreso();
    }
  }, [selectedRouletteEvent, activeTab, isAdminAuthenticated, participants]);

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

    if (name === 'evento') {
      setFollowedSponsors([]);
    }

    if (name === 'nombreCompleto' && type !== 'checkbox') {
      processedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    } else if (name === 'documento' && type !== 'checkbox') {
      processedValue = value.replace(/\D/g, '');
    } else if (name === 'edad' && type !== 'checkbox') {
      processedValue = value.replace(/\D/g, '').slice(0, 3);
    } else if (name === 'ciudadResidencia' && type !== 'checkbox') {
      processedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    } else if (name === 'celular' && type !== 'checkbox') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setFormStatus({ type: '', message: '' });

    if (!formData.terminos) {
      setFormStatus({ type: 'error', message: 'Debes aceptar los términos y condiciones.' });
      return;
    }
    if (!formData.evento) {
      setFormStatus({ type: 'error', message: 'Por favor selecciona un evento válido.' });
      return;
    }

    const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!onlyLettersRegex.test(formData.nombreCompleto.trim())) {
      setFormStatus({ type: 'error', message: 'El nombre completo solo debe contener letras.' });
      return;
    }

    if (formData.documento.length < 6) {
      setFormStatus({ type: 'error', message: 'El documento de identificación debe tener mínimo 6 dígitos numéricos.' });
      return;
    }

    if (!formData.edad || formData.edad.trim() === '') {
      setFormStatus({ type: 'error', message: 'La edad es obligatoria.' });
      return;
    }

    if (!formData.ciudadResidencia || !onlyLettersRegex.test(formData.ciudadResidencia.trim())) {
      setFormStatus({ type: 'error', message: 'La ciudad de residencia solo debe contener letras.' });
      return;
    }

    if (formData.celular.length !== 10) {
      setFormStatus({ type: 'error', message: 'El número de celular debe tener exactamente 10 dígitos.' });
      return;
    }

    setFormStatus({ type: 'loading', message: 'Guardando registro de forma segura...' });

    try {
      if (!user) {
        throw new Error("Conexión perdida con el servidor.");
      }

      const targetEvent = events.find(ev => ev.nombre === formData.evento);
      if (!targetEvent) {
        throw new Error("El evento seleccionado no es válido.");
      }

      const docId = `${formData.documento.trim()}_${targetEvent.id}`;
      const registradosDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrados', docId);
      const globalDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrados_globales', formData.documento.trim());

      const docSnap = await getDoc(registradosDocRef);
      if (docSnap.exists()) {
        setFormStatus({ 
          type: 'error', 
          message: `La identificación "${formData.documento}" ya está registrada en el evento "${formData.evento}".` 
        });
        playBeep(220, 0.4);
        return;
      }

      const payload = {
        nombreCompleto: formData.nombreCompleto.trim(),
        documento: formData.documento.trim(),
        edad: formData.edad.trim(),
        ciudadResidencia: formData.ciudadResidencia.trim(),
        celular: formData.celular.trim(),
        correo: formData.correo.trim(),
        evento: formData.evento,
        eventoId: targetEvent.id,
        fechaRegistro: Date.now()
      };

      await setDoc(registradosDocRef, payload);
      await setDoc(globalDocRef, {
        nombreCompleto: formData.nombreCompleto.trim(),
        documento: formData.documento.trim(),
        edad: formData.edad.trim(),
        ciudadResidencia: formData.ciudadResidencia.trim(),
        celular: formData.celular.trim(),
        correo: formData.correo.trim(),
        ultimaActividad: Date.now()
      });
      
      playBeep(880, 0.3);
      setFormStatus({ type: 'success', message: `¡Inscripción exitosa a "${formData.evento}"! Datos guardados.` });
      
      // Resetear el requisito de patrocinio obligatoriamente para soporte multiusuario en un mismo dispositivo
      setFollowedSponsors([]);

      setFormData(prev => ({
        ...prev,
        nombreCompleto: '',
        documento: '',
        edad: '',
        ciudadResidencia: '',
        celular: '',
        correo: '',
        terminos: false
      }));

      setTimeout(() => setFormStatus({ type: '', message: '' }), 5000);
    } catch (error) {
      console.error("Error writing document: ", error);
      setFormStatus({ type: 'error', message: 'Error de red o de permisos. Intenta nuevamente.' });
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.nombre.trim()) return;

    try {
      if (isEditingEvent && editingEventId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', editingEventId);
        await setDoc(docRef, {
          nombre: newEvent.nombre.trim(),
          descripcion: newEvent.descripcion.trim() || 'Sin descripción',
          categoria: newEvent.categoria,
          fechaCreado: Date.now()
        }, { merge: true });
        
        playBeep(880, 0.25);
        triggerNotification('success', 'Evento actualizado correctamente.');
        setIsEditingEvent(false);
        setEditingEventId(null);
      } else {
        const slug = newEvent.nombre.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
          .replace(/[^a-z0-9]+/g, '-')                      
          .replace(/(^-|-$)+/g, '');                        
        
        const docId = `evento-${slug}-${Date.now().toString().slice(-4)}`;
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', docId);
        await setDoc(docRef, {
          nombre: newEvent.nombre.trim(),
          descripcion: newEvent.descripcion.trim() || 'Sin descripción',
          fechaCreado: Date.now(),
          activo: true,
          categoria: newEvent.categoria
        });
        playBeep(660, 0.2);
        triggerNotification('success', 'Nuevo evento creado correctamente.');
      }
      setNewEvent({ nombre: '', descripcion: '', categoria: 'sport' });
    } catch (error) {
      triggerNotification('error', 'Error al guardar el evento.');
    }
  };

  const handleSaveSponsor = async (e) => {
    e.preventDefault();
    if (!newSponsor.nombre.trim() || !newSponsor.enlace.trim()) {
      triggerNotification('error', 'Debes completar el nombre y el enlace.');
      return;
    }
    if (newSponsor.vinculacion === 'custom' && (!newSponsor.eventosIds || newSponsor.eventosIds.length === 0)) {
      triggerNotification('error', 'Debes seleccionar al menos un evento para la vinculación específica.');
      return;
    }

    try {
      const payload = {
        nombre: newSponsor.nombre.trim(),
        enlace: newSponsor.enlace.trim(),
        vinculacion: newSponsor.vinculacion,
        eventosIds: newSponsor.vinculacion === 'all' ? [] : newSponsor.eventosIds,
        actualizadoEn: Date.now()
      };

      if (isEditingSponsor && editingSponsorId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'patrocinadores', editingSponsorId);
        await setDoc(docRef, payload, { merge: true });
        triggerNotification('success', 'Patrocinador actualizado correctamente.');
      } else {
        const docId = `sponsor-${Date.now()}`;
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'patrocinadores', docId);
        payload.creadoEn = Date.now();
        await setDoc(docRef, payload);
        triggerNotification('success', 'Nuevo patrocinador añadido con éxito.');
      }
      
      setNewSponsor({ nombre: '', enlace: '', vinculacion: 'all', eventosIds: [] });
      setIsEditingSponsor(false);
      setEditingSponsorId(null);
    } catch (error) {
      console.error("Error guardando patrocinador: ", error);
      triggerNotification('error', 'Error al guardar el patrocinador.');
    }
  };

  const handleDeleteSponsor = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patrocinadores', id));
      triggerNotification('success', 'Patrocinador eliminado permanentemente.');
    } catch (error) {
      console.error("Error eliminando patrocinador: ", error);
      triggerNotification('error', 'No se pudo eliminar el patrocinador.');
    }
  };

  const handleEditSponsor = (sponsor) => {
    setIsEditingSponsor(true);
    setEditingSponsorId(sponsor.id);
    setNewSponsor({ 
      nombre: sponsor.nombre, 
      enlace: sponsor.enlace,
      vinculacion: sponsor.vinculacion || 'all',
      eventosIds: sponsor.eventosIds || []
    });
  };

  const handleToggleEventActive = async (eventId, currentStatus) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'eventos', eventId);
      const newStatus = currentStatus === undefined ? false : !currentStatus;
      await setDoc(docRef, { activo: newStatus }, { merge: true });
      playBeep(600, 0.15);
      triggerNotification('success', `Evento ${newStatus ? 'activado' : 'desactivado'} para registros.`);
    } catch (error) {
      triggerNotification('error', 'Error al cambiar el estado del evento.');
    }
  };

  const handleStartEditEvent = (ev) => {
    setIsEditingEvent(true);
    setEditingEventId(ev.id);
    setNewEvent({ nombre: ev.nombre, descripcion: ev.descripcion, categoria: ev.categoria || 'sport' });
    playBeep(600, 0.15);
  };

  const handleCancelEditEvent = () => {
    setIsEditingEvent(false);
    setEditingEventId(null);
    setNewEvent({ nombre: '', descripcion: '', categoria: 'sport' });
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
    const cleanPin = adminPinInput.trim().toLowerCase();
    if (cleanPin === 'llanotorneos123' || cleanPin === '1234' || cleanPin === 'admin') {
      setIsAdminAuthenticated(true);
      setShowPinModal(false);
      setAdminPinInput('');
      setAdminError('');
      playBeep(800, 0.25);
      triggerNotification('success', 'Sesión de Administrador Autorizada.');
    } else {
      setAdminError('Código de acceso incorrecto. Por favor introduce la clave correcta.');
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

  // --- EXCELENTE MEJORA: ACTUALIZACIÓN REACTIVA INSTANTÁNEA AL ELIMINAR ---
  const confirmDeleteParticipant = async () => {
    if (!deleteTargetId) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrados', deleteTargetId);
      await deleteDoc(docRef);
      
      // Actualizar inmediatamente el estado local del Admin para que desaparezca sin forzar un "Sincronizar"
      setParticipants(prev => prev.filter(p => p.id !== deleteTargetId));

      playBeep(300, 0.2);
      triggerNotification('success', 'Participante eliminado de forma permanente.');
      
      // Eliminar también de las listas locales del sorteo si corresponde
      if (sorteoActive) {
        setSorteoCandidates(prev => prev.filter(p => p.id !== deleteTargetId));
        setSorteoWinners(prev => prev.filter(p => p.id !== deleteTargetId));
      }
    } catch (error) {
      console.error("Error al borrar participante: ", error);
      triggerNotification('error', 'No se pudo eliminar el registro en la nube.');
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

    const headers = ['Nombre Completo', 'Documento', 'Edad', 'Ciudad Residencia', 'Celular', 'Correo', 'Evento Registrado', 'Categoria', 'Fecha Registro'];
    const rows = filteredList.map(p => [
      p.nombreCompleto,
      p.documento,
      p.edad || 'N/A',
      p.ciudadResidencia || 'N/A',
      p.celular,
      p.correo,
      p.evento,
      getEventBrand(p.evento) === 'sport' ? 'Sport (Deportivo)' : 'Gaming (E-Sports)',
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
    
    const rowsHTML = filteredList.map(p => {
      const brand = getEventBrand(p.evento);
      const isSport = brand === 'sport';
      const categoryLabel = isSport ? 'Sport (Deportivo)' : 'Gaming (E-Sports)';
      const categoryColor = isSport ? '#00e5ff' : '#ff0000';

      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: sans-serif; font-size: 11pt;">${escapeHTML(p.nombreCompleto)}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #38bdf8; background-color: #0f172a; font-family: monospace; font-size: 11pt; mso-number-format:'\\@';">${escapeHTML(p.documento)}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: monospace; font-size: 11pt;">${escapeHTML(p.edad || 'N/A')}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: sans-serif; font-size: 11pt;">${escapeHTML(p.ciudadResidencia || 'N/A')}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: monospace; font-size: 11pt; mso-number-format:'\\@';">${escapeHTML(p.celular)}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc; background-color: #0f172a; font-family: sans-serif; font-size: 11pt;">${escapeHTML(p.correo)}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: ${categoryColor}; background-color: #0f172a; font-family: sans-serif; font-size: 11pt; font-weight: bold;">${escapeHTML(categoryLabel)}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #00e5ff; background-color: #0f172a; font-family: sans-serif; font-size: 11pt; font-weight: bold;">${escapeHTML(p.evento)}</td>
          <td style="padding: 10px; border: 1px solid #334155; color: #94a3b8; background-color: #0f172a; font-family: monospace; font-size: 10pt;">${escapeHTML(new Date(p.fechaRegistro).toLocaleString())}</td>
        </tr>
      `;
    }).join('');

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
          <tr>
            <th colspan="9" style="text-align: center; font-size: 18pt; font-weight: bold; background-color: #0f172a; color: #00e5ff; border: 1px solid #334155; height: 50px; padding: 15px;">
              LLANO TORNEO MULTI-PLATAFORMA (SPORT & GAMING) - LISTA OFICIAL
            </th>
          </tr>
          <tr>
            <th colspan="9" style="text-align: center; font-size: 10pt; font-weight: bold; background-color: #0f172a; color: #94a3b8; border: 1px solid #334155; padding: 5px;">
              Filtro: ${selectedAdminEvent === 'all' ? 'Todos los Eventos' : selectedAdminEvent} | Descargado: ${new Date().toLocaleString()}
            </th>
          </tr>
          <tr style="height: 15px;">
            <td colspan="9" style="background-color: #020617; border: none;"></td>
          </tr>
          <tr style="height: 35px;">
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Nombre Completo</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Documento</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Edad</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Ciudad Residencia</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Celular</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Correo</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Categoría</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Evento Asociado</th>
            <th style="background-color: #1e293b; color: #00e5ff; border: 1px solid #334155; font-family: sans-serif; font-size: 11pt; font-weight: bold; padding: 10px;">Fecha Registro</th>
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

  // Pool general de participantes del evento seleccionado
  const roulettePool = participants.filter(p => p.evento === selectedRouletteEvent);

  // Determinar qué pool se dibujará y sorteará en la ruleta (exclusión si el sorteo en la nube está activo)
  const activePoolForDraw = sorteoActive ? sorteoCandidates : roulettePool;

  // Si supera los 50 inscritos cambia a modo "Sorteo de Alto Rendimiento"
  const isMassivePool = activePoolForDraw.length > 50;

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

    if (activePoolForDraw.length === 0) {
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
      ctx.fillText(sorteoActive ? 'No quedan candidatos' : 'Sin participantes registrados', centerX, centerY - 10);
      ctx.font = '12px sans-serif';
      ctx.fillText(sorteoActive ? 'en este sorteo especial' : 'en este evento aún', centerX, centerY + 10);
      return;
    }

    const rouletteEventObj = events.find(ev => ev.nombre === selectedRouletteEvent);
    const rouletteBrand = rouletteEventObj?.categoria === 'gaming' ? 'gaming' : 'sport';
    const activeBrandColorRaw = brandStyles[rouletteBrand]?.primaryRaw || '#22d3ee';

    // Limitar visualmente el dibujo a un número de segmentos premium de alto rendimiento
    const renderLength = isMassivePool ? 20 : activePoolForDraw.length;
    const arc = Math.PI / (renderLength / 2);

    ctx.strokeStyle = activeBrandColorRaw;
    ctx.lineWidth = 6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = activeBrandColorRaw;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.shadowBlur = 0; 

    const activeWheelColors = rouletteBrand === 'gaming'
      ? ['#ff0000', '#0f172a', '#f43f5e', '#1e293b', '#be123c', '#0f172a']
      : ['#00e5ff', '#0f172a', '#38bdf8', '#1e293b', '#0284c7', '#0f172a'];

    for (let i = 0; i < renderLength; i++) {
      const angle = startAngle + i * arc;
      ctx.fillStyle = activeWheelColors[i % activeWheelColors.length];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc, false);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      
      const sliceColor = activeWheelColors[i % activeWheelColors.length];
      const needsDarkText = sliceColor === '#00e5ff' || sliceColor === '#38bdf8' || sliceColor === '#ff0000' || sliceColor === '#f43f5e';
      ctx.fillStyle = needsDarkText ? '#020617' : '#ffffff';
      
      if (!needsDarkText) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
      }
      
      ctx.translate(centerX + Math.cos(angle + arc / 2) * (radius / 1.7), centerY + Math.sin(angle + arc / 2) * (radius / 1.7));
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      
      let textToRender = '';
      if (isMassivePool) {
        textToRender = `BOMBO #${i + 1}`;
      } else {
        const rawText = activePoolForDraw[i].nombreCompleto;
        textToRender = rawText.length > 15 ? rawText.substring(0, 13) + '..' : rawText;
      }

      ctx.fillText(textToRender, 0, 0);
      ctx.restore();
    }

    // Botón central adaptativo
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = activeBrandColorRaw;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = activeBrandColorRaw;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = activeBrandColorRaw;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(rouletteBrand === 'gaming' ? '🎮' : '⚽', centerX, centerY + 6);
  };

  useEffect(() => {
    drawRouletteWheel();
  }, [startAngle, participants, selectedRouletteEvent, events, sorteoActive, sorteoCandidates, activePoolForDraw]);

  // Actualizador veloz de nombres ciclando durante sorteos masivos
  useEffect(() => {
    if (!isSpinning || !isMassivePool || activePoolForDraw.length === 0) return;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activePoolForDraw.length);
      setCyclingName(activePoolForDraw[randomIndex].nombreCompleto);
    }, 60);
    return () => clearInterval(interval);
  }, [isSpinning, isMassivePool, activePoolForDraw]);

  // Manejo de cambio de evento en la ruleta
  useEffect(() => {
    if (sorteoActive) {
      setSorteoActive(false);
      setSorteoCandidates([]);
      setSorteoWinners([]);
      triggerNotification('success', 'Evento cambiado. Cargando sorteo asociado...');
    }
  }, [selectedRouletteEvent]);

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
      const easing = 1 - Math.pow(1 - ts, 3); 
      const currentAngle = startAngle + (spinAngleStart * (1 - easing)) * (Math.PI / 180);
      
      const totalSlices = isMassivePool ? 20 : activePoolForDraw.length;
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
    if (activePoolForDraw.length === 0) {
      triggerNotification('error', 'No hay personas disponibles en la ruleta de este evento.');
      return;
    }

    const startAngleValue = Math.random() * 10 + 10;
    const totalSpinTime = Math.random() * 3000 + 4000; 

    setSpinAngleStart(startAngleValue * 25);
    setSpinTime(0);
    setSpinTimeTotal(totalSpinTime);
    setIsSpinning(true);
    playBeep(520, 0.2);
  };

  const stopRotateWheel = async () => {
    setIsSpinning(false);
    const len = activePoolForDraw.length;
    if (len === 0) return;

    // Sorteo matemático de alta precisión
    const winningIndex = Math.floor(Math.random() * len);
    const chosenWinner = activePoolForDraw[winningIndex];
    
    setWinnerName(chosenWinner.nombreCompleto);
    setWinnerDoc(chosenWinner.documento || ''); 
    setShowWinnerModal(true);
    playConfettiBeeps();
    setCyclingName('');

    // --- PERSISTENCIA DEL GANADOR EN FIRESTORE EN TIEMPO REAL ---
    if (sorteoActive) {
      try {
        const progressDocId = `winner_${chosenWinner.id}_${Date.now()}`;
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sorteo_progreso', progressDocId);
        
        const progressPayload = {
          id: chosenWinner.id,
          nombreCompleto: chosenWinner.nombreCompleto,
          documento: chosenWinner.documento || '',
          evento: selectedRouletteEvent,
          fechaGanado: Date.now()
        };

        await setDoc(docRef, progressPayload);

        // Actualizar estados reactivos locales al completarse con éxito en la nube
        setSorteoWinners(prev => [...prev, progressPayload]);
        setSorteoCandidates(prev => prev.filter(p => p.id !== chosenWinner.id));
        triggerNotification('success', `${chosenWinner.nombreCompleto} ha sido guardado permanentemente como ganador.`);
      } catch (err) {
        console.error("Error al persistir ganador: ", err);
        triggerNotification('error', 'Ganador seleccionado pero con fallas de persistencia de red.');
        
        // Fallback local por seguridad ante micro-cortes de red
        setSorteoWinners(prev => [...prev, {
          id: chosenWinner.id,
          nombreCompleto: chosenWinner.nombreCompleto,
          documento: chosenWinner.documento || '',
          evento: selectedRouletteEvent,
          fechaGanado: Date.now()
        }]);
        setSorteoCandidates(prev => prev.filter(p => p.id !== chosenWinner.id));
      }
    }
  };

  // --- CONTROLADORES PARA GESTIÓN DEL FLUJO DEL SORTEO PERSISTENTE ---
  const handleStartSorteoSession = () => {
    if (roulettePool.length === 0) {
      triggerNotification('error', 'No hay personas registradas en este evento para iniciar un sorteo.');
      return;
    }
    setSorteoCandidates([...roulettePool]);
    setSorteoWinners([]);
    setSorteoActive(true);
    playBeep(880, 0.35);
    triggerNotification('success', 'Sesión de Sorteo Activada. Ganadores sincronizados con la nube.');
  };

  const handleFinishSorteoSession = async () => {
    if (!user || !selectedRouletteEvent) return;
    setIsSyncingSorteo(true);
    try {
      // Descargamos todo el progreso para identificar qué borrar (RULE 2: Sin queries complejas)
      const progressCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'sorteo_progreso');
      const snapshot = await getDocs(progressCollectionRef);
      
      const deletePromises = [];
      snapshot.forEach((progressDoc) => {
        const data = progressDoc.data();
        if (data.evento === selectedRouletteEvent) {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sorteo_progreso', progressDoc.id);
          deletePromises.push(deleteDoc(docRef));
        }
      });

      await Promise.all(deletePromises);

      // Limpiamos estados locales
      setSorteoActive(false);
      setSorteoCandidates([]);
      setSorteoWinners([]);
      playBeep(440, 0.25);
      triggerNotification('success', 'Sorteo finalizado. Base de datos de progreso limpia y candidatos reintegrados.');
    } catch (error) {
      console.error("Error al borrar progreso en Firestore: ", error);
      triggerNotification('error', 'Error al reiniciar progreso en la nube.');
      
      // Reinicio local para no bloquear el evento
      setSorteoActive(false);
      setSorteoCandidates([]);
      setSorteoWinners([]);
    } finally {
      setIsSyncingSorteo(false);
    }
  };

  const handleImageError = (e) => {
    e.target.src = activeBrand === 'sport' 
      ? 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=150&h=150&q=80'
      : 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=150&h=150&q=80';
  };

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN OPTIMIZADA ---
  const filteredParticipants = participants.filter(p => {
    if (selectedAdminEvent !== 'all' && p.evento !== selectedAdminEvent) return false;
    const query = searchQuery.toLowerCase();
    return (
      (p.nombreCompleto || '').toLowerCase().includes(query) ||
      (p.documento || '').toLowerCase().includes(query)
    );
  });

  // Reiniciar página actual a la primera cuando cambian los filtros principales de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAdminEvent, pageSize]);

  const totalPages = Math.ceil(filteredParticipants.length / pageSize) || 1;
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all duration-500 selection:bg-slate-100 selection:text-slate-950">
      
      {/* Header adaptable */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Cabecera / Marca Adaptable */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className={`absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500 ${activeBrand === 'sport' ? 'bg-cyan-400' : 'bg-red-500'}`}></div>
                <img 
                  src={activeBrandStyles.logo} 
                  alt={`Llano Torneo ${activeBrandStyles.title} Logo`} 
                  className={`relative h-14 w-14 rounded-full object-cover border-2 shadow-md transition-all duration-300 ${activeBrand === 'sport' ? 'border-cyan-400' : 'border-red-500'}`}
                  onError={handleImageError}
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-wider uppercase text-white transition-colors duration-300">
                  Llano Torneo<span className={`${activeBrandStyles.titleColor} font-extrabold text-md sm:text-lg block sm:inline sm:ml-1.5 transition-colors duration-300`}>{activeBrandStyles.title}</span>
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-6">
              <button 
                onClick={() => { setActiveTab('register'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] ${
                  activeTab === 'register' 
                    ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950 shadow-lg ${activeBrandStyles.shadowAccent}` 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <UserPlus className="w-5 h-5 shrink-0" />
                Registrarse
              </button>

              {isAdminAuthenticated && (
                <>
                  <button 
                    onClick={() => handleAdminTabAccess('admin-list')}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] ${
                      activeTab === 'admin-list' 
                        ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950 shadow-lg ${activeBrandStyles.shadowAccent}` 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Users className="w-5 h-5 shrink-0" />
                    Panel Registrados
                  </button>

                  <button 
                    onClick={() => handleAdminTabAccess('roulette')}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] ${
                      activeTab === 'roulette' 
                        ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950 shadow-lg ${activeBrandStyles.shadowAccent}` 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Gift className="w-5 h-5 shrink-0" />
                    Ruleta Sorteo
                  </button>

                  <button 
                    onClick={() => handleAdminTabAccess('manage-events')}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] ${
                      activeTab === 'manage-events' 
                        ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950 shadow-lg ${activeBrandStyles.shadowAccent}` 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-5 h-5 shrink-0" />
                    Gestión Eventos
                  </button>

                  <button 
                    onClick={() => handleAdminTabAccess('sponsors')}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] ${
                      activeTab === 'sponsors' 
                        ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950 shadow-lg ${activeBrandStyles.shadowAccent}` 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Award className="w-5 h-5 shrink-0" />
                    Marcas Aliadas
                  </button>
                </>
              )}
            </nav>

            {/* Opciones Especiales */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg bg-slate-800 text-slate-300 transition-colors ${activeBrand === 'sport' ? 'hover:text-cyan-400' : 'hover:text-red-500'}`}
                title={soundEnabled ? "Silenciar" : "Activar Sonido"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {isAdminAuthenticated ? (
                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-colors ${activeBrand === 'sport' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-red-600 text-white border-red-500'}`}>
                  <span className="w-2 h-2 rounded-full animate-pulse bg-white"></span>
                  Admin Activado
                </div>
              ) : (
                <button 
                  onClick={() => setShowPinModal(true)}
                  className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg transition text-slate-300 hover:text-white font-bold uppercase tracking-wider"
                >
                  <Lock className={`w-4 h-4 ${activeBrandStyles.textAccent}`} />
                  Acceso Admin
                </button>
              )}

              {/* Menú Móvil */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Drawer de Navegación Móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 bg-slate-900 border-b border-slate-800 space-y-2 animate-fade-in">
            <button 
              onClick={() => { setActiveTab('register'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                activeTab === 'register' ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950` : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              Inscripción de Participantes
            </button>
            
            {isAdminAuthenticated && (
              <>
                <button 
                  onClick={() => handleAdminTabAccess('admin-list')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'admin-list' ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950` : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-5 h-5 shrink-0" />
                  Lista de Inscritos
                </button>
                <button 
                  onClick={() => handleAdminTabAccess('roulette')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'roulette' ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950` : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Gift className="w-5 h-5 shrink-0" />
                  Ruleta de Sorteos
                </button>
                <button 
                  onClick={() => handleAdminTabAccess('manage-events')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'manage-events' ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950` : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-5 h-5 shrink-0" />
                  Gestión de Eventos
                </button>

                <button
                  onClick={() => handleAdminTabAccess('sponsors')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'sponsors' ? `bg-gradient-to-r ${activeBrandStyles.gradient} text-slate-950` : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-5 h-5 shrink-0" />
                  Marcas Aliadas
                </button>
              </>
            )}
            
            <div className="pt-2 border-t border-slate-800/60">
              {isAdminAuthenticated ? (
                <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-white"></span>
                  Sesión Admin Activa
                </div>
              ) : (
                <button 
                  onClick={() => { setShowPinModal(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs bg-slate-800 text-slate-300 rounded-lg hover:text-white"
                >
                  <Lock className={`w-4 h-4 mr-1 ${activeBrandStyles.textAccent}`} />
                  Iniciar Sesión de Administrador
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Toast de Notificación */}
      {notification && (
        <div className={`fixed top-24 right-4 z-50 animate-bounce-in max-w-sm w-full bg-slate-900 border-l-4 p-4 rounded-r-lg shadow-2xl flex items-start gap-3 border-slate-800 ${activeBrand === 'sport' ? 'border-cyan-400' : 'border-red-500'}`}>
          {notification.type === 'success' ? (
            <CheckCircle className={`w-6 h-6 shrink-0 ${activeBrandStyles.textAccent}`} />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold text-white">Mensaje del Sistema</p>
            <p className="text-xs text-slate-300">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Contenedor Principal */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Widget de Servidor - Solo visible a Administradores */}
        {isAdminAuthenticated && (
          <div className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeBrand === 'sport' ? 'bg-cyan-400' : 'bg-red-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${activeBrand === 'sport' ? 'bg-cyan-500' : 'bg-red-500'}`}></span>
              </span>
              <p className="text-sm font-semibold text-slate-300">
                Sincronización Avanzada bajo Demanda y Respaldos del Sorteo en la Nube
              </p>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="bg-slate-800 px-3 py-1.5 rounded-full text-slate-300">
                {events.length} Eventos Activos
              </span>
              <span className={`border px-3 py-1.5 rounded-full ${activeBrand === 'sport' ? 'bg-cyan-950 text-cyan-400 border-cyan-900' : 'bg-red-950 text-red-500 border-red-900'}`}>
                {participants.length} Registrados Totales
              </span>
            </div>
          </div>
        )}

        {/* Tab 1: Formulario de Registro */}
        {activeTab === 'register' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Tarjeta Promocional adaptable */}
            <div className="lg:col-span-5 space-y-6">
              <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -z-10 opacity-10 ${activeBrand === 'sport' ? 'bg-cyan-500' : 'bg-red-500'}`}></div>
                
                {/* Logo Central de Marca */}
                <div className="flex justify-center mb-6">
                  <div className="p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl max-w-[180px] w-full aspect-square flex items-center justify-center">
                    <img 
                      src={activeBrandStyles.logo} 
                      alt={`Logo Oficial Llano Torneo ${activeBrandStyles.title}`} 
                      className="rounded-xl w-full object-contain max-h-full"
                      onError={handleImageError}
                    />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-2 uppercase">REGISTRO DE PARTICIPANTES</h2>
                <p className="text-sm text-slate-400 text-center mb-6">
                  Inscríbete seleccionando tu evento. Tus datos quedarán asegurados en nuestra base de datos permanente en la nube.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
                    <div className={`p-2 rounded-lg shrink-0 ${activeBrandStyles.glowBg} ${activeBrandStyles.textAccent}`}>
                      {activeBrand === 'sport' ? <Trophy className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Eventos Deportivos & Gaming</h4>
                      <p className="text-xs text-slate-400">Escoge el torneo o sorteo de tu preferencia para asegurar tu cupo y acreditación.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
                    <div className={`p-2 rounded-lg shrink-0 ${activeBrandStyles.glowBg} ${activeBrandStyles.textAccent}`}>
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Sorteos Integrados</h4>
                      <p className="text-xs text-slate-400">Al registrarte, ingresas directamente a la ruleta del evento para sorteos interactivos en directo.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/50">
                    <div className={`p-2 rounded-lg shrink-0 ${activeBrandStyles.glowBg} ${activeBrandStyles.textAccent}`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Respaldo Inmune a Caídas</h4>
                      <p className="text-xs text-slate-400">El servidor almacena tu información de manera instantánea garantizando seguridad absoluta.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceso Rápido */}
              <div className={`bg-gradient-to-r to-slate-900 border rounded-xl p-4 flex justify-between items-center transition-colors duration-300 ${activeBrand === 'sport' ? 'from-cyan-950/10 border-cyan-500/10' : 'from-red-950/10 border-red-500/10'}`}>
                <div className="text-xs text-slate-400">
                  ¿Eres el organizador?
                </div>
                <button 
                  onClick={() => handleAdminTabAccess('admin-list')}
                  className={`text-xs font-bold transition flex items-center gap-1 ${activeBrandStyles.textAccent} ${activeBrandStyles.textAccentHover}`}
                >
                  <Lock className="w-3 h-3" /> Panel Administrativo
                </button>
              </div>
            </div>

            {/* Formulario de Registro adaptable */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">FORMULARIO OFICIAL</h3>
                  <p className="text-xs text-slate-400">Ingresa tus datos válidos para procesar tu participación.</p>
                </div>
                <div className={`p-2 rounded-lg font-bold text-xs tracking-wider text-slate-950 transition-colors duration-300 ${activeBrandStyles.bgAccent}`}>
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
                      <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin shrink-0 ${activeBrand === 'sport' ? 'border-cyan-400' : 'border-red-500'}`}></div>
                    ) : formStatus.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>{formStatus.message}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selector de Evento */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Selecciona el Evento al que te vas a registrar *</label>
                    <select 
                      name="evento"
                      required
                      value={formData.evento}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-all ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    >
                      {events.filter(ev => ev.activo !== false).length > 0 ? (
                        events.filter(ev => ev.activo !== false).map(ev => (
                          <option key={ev.id} value={ev.nombre}>
                            {ev.categoria === 'gaming' ? '🎮' : '⚽'} {ev.nombre}
                          </option>
                        ))
                      ) : (
                        <option value="">No hay eventos activos disponibles para registros...</option>
                      )}
                    </select>
                  </div>

                  {/* Nombre Completo */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Nombre Completo *</label>
                    <input 
                      type="text" 
                      name="nombreCompleto"
                      required
                      value={formData.nombreCompleto}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Carlos Ortega" 
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    />
                  </div>

                  {/* Documento */}
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
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all font-mono ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    />
                  </div>

                  {/* Edad */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Edad *</label>
                    <input 
                      type="text" 
                      name="edad"
                      required
                      inputMode="numeric"
                      maxLength={3}
                      value={formData.edad}
                      onChange={handleInputChange}
                      placeholder="Ej. 25" 
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all font-mono ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    />
                  </div>

                  {/* Ciudad de Residencia */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Ciudad de Residencia *</label>
                    <input 
                      type="text" 
                      name="ciudadResidencia"
                      required
                      value={formData.ciudadResidencia}
                      onChange={handleInputChange}
                      placeholder="Ej. Villavicencio" 
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    />
                  </div>

                  {/* Número de Celular */}
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
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all font-mono ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Correo Electrónico *</label>
                    <input 
                      type="email" 
                      name="correo"
                      required
                      value={formData.correo}
                      onChange={handleInputChange}
                      placeholder="ejemplo@correo.com" 
                      className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                    />
                  </div>
                </div>

                {/* --- REQUISITO DE PATROCINADORES (Sponsor Gate) --- */}
                <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className={`font-bold text-sm mb-0.5 animate-pulse ${activeBrandStyles.textAccent}`}>
                        Misión obligatoria requerida
                      </h4>
                      <p className="text-xs text-slate-400">
                        {filteredSponsorsForRegister.length > 0 
                          ? `Debes seguir a todas las marcas aliadas en su Instagram para validar tu cupo. (${followedSponsors.filter(id => filteredSponsorsForRegister.some(s => s.id === id)).length}/${filteredSponsorsForRegister.length})`
                          : 'Este evento no requiere validación de marcas asociadas.'
                        }
                      </p>
                    </div>
                    
                    {allSponsorsFollowed ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <CheckCircle className="w-4.5 h-4.5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Listo</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSponsorsModal(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-white transition-all duration-300 bg-gradient-to-r ${activeBrandStyles.gradient} hover:scale-105 shadow-lg shrink-0`}
                      >
                        Ver Marcas
                      </button>
                    )}
                  </div>
                </div>

                {/* Aceptación de Términos */}
                <div className="flex items-start gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="terminos" 
                    name="terminos"
                    required
                    checked={formData.terminos}
                    onChange={handleInputChange}
                    className={`mt-1 w-4 h-4 text-slate-950 bg-slate-950 border-slate-800 rounded focus:ring-offset-slate-900 focus:ring-2 ${activeBrand === 'sport' ? 'focus:ring-cyan-500' : 'focus:ring-red-500'}`}
                  />
                  <label htmlFor="terminos" className="text-xs text-slate-400 leading-normal select-none">
                    Acepto que mis datos sean guardados en la nube de <span className={`font-bold ${activeBrandStyles.textAccent}`}>Llano Torneo {activeBrandStyles.title}</span> para coordinar mi participación en eventos, sorteos y actividades interactivas relacionadas.
                  </label>
                </div>

                {/* Botón de Enviar */}
                <button 
                  type="submit" 
                  disabled={formStatus.type === 'loading' || !allSponsorsFollowed}
                  className={`w-full mt-2 bg-gradient-to-r text-slate-950 font-black tracking-wider text-sm py-4 rounded-xl shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 uppercase disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed ${activeBrandStyles.gradient} ${activeBrandStyles.hoverGradient} ${activeBrandStyles.shadowAccent}`}
                >
                  <UserPlus className="w-5 h-5 text-slate-950" />
                  {formStatus.type === 'loading' 
                    ? 'Procesando...' 
                    : allSponsorsFollowed 
                      ? 'Confirmar Registro' 
                      : 'Sigue a los Patrocinadores'
                  }
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Panel de Registrados */}
        {activeTab === 'admin-list' && isAdminAuthenticated && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            
            <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className={`w-5 h-5 ${activeBrandStyles.textAccent}`} />
                  CONTROL DE PARTICIPANTES MULTI-EVENTO
                </h3>
                <p className="text-xs text-slate-400">Base de datos de inscritos estructurada de forma segura bajo demanda.</p>
              </div>

              {/* Descarga de CSV y Excel */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleExportCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700/60"
                >
                  <Download className="w-4 h-4" /> Exportar archivo CSV
                </button>
                <button 
                  onClick={handleExportExcel}
                  className={`bg-gradient-to-r text-slate-950 font-black px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition shadow-lg ${activeBrandStyles.gradient} ${activeBrandStyles.hoverGradient} ${activeBrandStyles.shadowAccent}`}
                >
                  <Trophy className="w-4 h-4 text-slate-950" /> Exportar a Excel (.xls)
                </button>
              </div>
            </div>

            {/* BARRA DE ACCESO BAJO DEMANDA (Pull Architecture) */}
            <div className="bg-slate-950/80 p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4.5 h-4.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <div>
                  <span className="text-xs font-bold text-white block">Sincronización Manual (Ahorro de Servidor)</span>
                  <span className="text-[10px] text-slate-400 block">Descarga de forma segura y puntual las últimas inscripciones de Firestore.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lastSyncTime && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-850">
                    Último Pull: {lastSyncTime.toLocaleTimeString()}
                  </span>
                )}
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={syncParticipants}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-slate-950 transition-all duration-200 disabled:opacity-50 ${activeBrandStyles.bgAccent} hover:scale-[1.02]`}
                >
                  {isSyncing ? 'Actualizando...' : '🔄 Sincronizar Ahora'}
                </button>
              </div>
            </div>

            {/* Selectores de Filtro de Evento */}
            <div className="bg-slate-950/40 p-4 border-b border-slate-800">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Filter className={`w-3.5 h-3.5 ${activeBrandStyles.textAccent}`} /> Filtro de Selección de Eventos:
              </span>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedAdminEvent('all')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    selectedAdminEvent === 'all'
                      ? 'bg-slate-200 text-slate-950 font-black shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  🎯 Todos los Registrados ({participants.length})
                </button>
                {events.map((ev) => {
                  const eventCount = participants.filter(p => p.evento === ev.nombre).length;
                  const isGaming = ev.categoria === 'gaming';
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedAdminEvent(ev.nombre)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                        selectedAdminEvent === ev.nombre
                          ? isGaming
                            ? 'bg-red-500 text-slate-950 font-black shadow-lg'
                            : 'bg-cyan-400 text-slate-950 font-black shadow-lg'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {isGaming ? '🎮' : '⚽'} {ev.nombre} ({eventCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Métricas rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800 bg-slate-950/20 text-center text-xs">
              <div className="p-4 border-r border-slate-800">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Filtro Seleccionado</span>
                <span className={`text-sm font-bold truncate block max-w-[200px] mx-auto ${activeBrandStyles.textAccent}`}>
                  {selectedAdminEvent === 'all' ? 'Todos los Eventos' : selectedAdminEvent}
                </span>
              </div>
              <div className="p-4 border-r border-slate-800">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Inscritos en Filtro</span>
                <span className="text-xl font-black text-white">
                  {filteredParticipants.length}
                </span>
              </div>
              <div className="p-4 border-r border-slate-800">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Porcentaje del Total</span>
                <span className="text-xl font-black text-white">
                  {participants.length > 0 
                    ? Math.round((filteredParticipants.length / participants.length) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="p-4">
                <span className="block text-[10px] font-black tracking-widest text-slate-500 uppercase">Categoría Principal</span>
                <span className="text-xs font-bold text-white uppercase mt-1 block">
                  {selectedAdminEvent === 'all' ? 'Doble Marca' : getEventBrand(selectedAdminEvent) === 'gaming' ? '🎮 Gaming E-Sports' : '⚽ Deporte Sport'}
                </span>
              </div>
            </div>

            {/* Barra de buscador y Paginador */}
            <div className="p-4 bg-slate-950/20 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-2/3">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar de forma instantánea por nombre o cédula..." 
                  className={`w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${activeBrand === 'sport' ? 'focus:border-cyan-400 focus:ring-cyan-500' : 'focus:border-red-500 focus:ring-red-500'}`}
                />
              </div>

              {/* Selector de Tamaño de Página */}
              <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
                <span className="text-slate-400">Ver por página:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                >
                  <option value={10}>10 filas</option>
                  <option value={25}>25 filas</option>
                  <option value={50}>50 filas</option>
                  <option value={100}>100 filas</option>
                </select>
              </div>
            </div>

            {/* Tabla de Datos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-xs font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-4">Participante</th>
                    <th className="p-4">Identificación</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Evento Asociado</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedParticipants.length > 0 ? (
                    paginatedParticipants.map((p) => {
                      const itemBrand = getEventBrand(p.evento);
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition text-sm">
                          <td className="p-4 font-bold text-white">
                            {p.nombreCompleto}
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              Edad: {p.edad || 'N/A'} años | Ciudad: {p.ciudadResidencia || 'N/A'}
                            </div>
                          </td>
                          <td className="p-4 text-slate-300 font-mono">{p.documento}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5 text-xs text-slate-300">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" /> {p.celular}
                              </span>
                              <span className="flex items-center gap-1 text-slate-400 font-mono">
                                <Mail className="w-3 h-3 text-slate-500" /> {p.correo}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                              itemBrand === 'gaming' 
                                ? 'bg-red-950/60 text-red-400 border border-red-900/40' 
                                : 'bg-cyan-950/60 text-cyan-400 border border-cyan-900/40'
                            }`}>
                              {itemBrand === 'gaming' ? '🎮 Gaming' : '⚽ Sport'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="bg-slate-950 px-2.5 py-1 rounded-full text-xs font-bold text-slate-300 border border-slate-800/80 block w-fit truncate max-w-[200px]" title={p.evento}>
                              {p.evento}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => requestDeleteParticipant(p.id, p.nombreCompleto)}
                              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                              title="Eliminar inscripción"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-slate-500 text-sm">
                        No hay registros de inscripción con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {filteredParticipants.length > 0 && (
              <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs text-slate-400">
                <div>
                  Mostrando del <span className="font-bold text-white">{Math.min(filteredParticipants.length, (currentPage - 1) * pageSize + 1)}</span> al <span className="font-bold text-white">{Math.min(filteredParticipants.length, currentPage * pageSize)}</span> de <span className="font-bold text-white">{filteredParticipants.length}</span> registros filtrados.
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded transition"
                    title="Primera Página"
                  >
                    <ChevronsLeft className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded transition"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>

                  <span className="px-3.5 py-1.5 bg-slate-950 rounded border border-slate-800 font-bold text-white">
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded transition"
                    title="Siguiente"
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded transition"
                    title="Última Página"
                  >
                    <ChevronsRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Ruleta Electrónica de Sorteos */}
        {activeTab === 'roulette' && isAdminAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fade-in">
            
            {/* Área de Ruleta adaptable con optimización masiva */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl">
              <div className={`absolute top-0 left-0 w-32 h-32 rounded-full blur-2xl opacity-10 ${activeBrand === 'sport' ? 'bg-cyan-400' : 'bg-red-500'}`}></div>
              
              <div className="w-full text-center mb-4">
                <span className={`border text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${activeBrand === 'sport' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-800' : 'bg-red-500/10 text-red-500 border-red-800'}`}>
                  Sorteos en Directo - Llano {activeBrandStyles.title}
                </span>
                
                <h3 className="text-xl font-black text-white mt-2 uppercase flex items-center justify-center gap-1.5">
                  RULETA ELECTRÓNICA 
                  {isMassivePool && (
                    <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold animate-pulse font-sans">MODO RENDIMIENTO</span>
                  )}
                  {sorteoActive && (
                    <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black tracking-wider animate-pulse font-sans">SORTEO EN LA NUBE</span>
                  )}
                </h3>
                
                <div className="mt-4 max-w-sm mx-auto">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Selecciona el Evento con el que deseas Sorteos:
                  </label>
                  <select
                    value={selectedRouletteEvent}
                    disabled={sorteoActive}
                    onChange={(e) => setSelectedRouletteEvent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.nombre}>
                        {ev.categoria === 'gaming' ? '🎮' : '⚽'} {ev.nombre}
                      </option>
                    ))}
                  </select>
                  {sorteoActive && (
                    <p className="text-[10px] text-amber-400 font-semibold mt-1">
                      Finaliza la sesión actual si deseas cambiar de evento.
                    </p>
                  )}
                </div>
              </div>

              {/* Botón rápido para Sincronizar en Ruleta */}
              <div className="flex gap-2 items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 text-xs w-full max-w-sm justify-between">
                <span className="text-slate-400">¿Inscritos desactualizados?</span>
                <button
                  onClick={syncParticipants}
                  disabled={isSyncing}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Actualizar'}
                </button>
              </div>

              {/* Contenedor del Canvas de la Ruleta */}
              <div className="relative my-4 flex flex-col items-center justify-center">
                {/* Flecha indicadora adaptable */}
                <div className="absolute top-[18px] z-30 drop-shadow-lg animate-bounce">
                  <div className={`w-8 h-8 rotate-45 transform origin-center border-2 border-white rounded-br-md ${activeBrand === 'sport' ? 'bg-cyan-400' : 'bg-red-500'}`}></div>
                </div>

                <canvas 
                  ref={canvasRef} 
                  width="420" 
                  height="420" 
                  className="max-w-full h-auto aspect-square rounded-full shadow-2xl bg-slate-950 border border-slate-800 mt-8"
                />

                {/* MODAL / VISOR DE NOMBRE PARA SORTEOS MASIVOS */}
                {isMassivePool && (
                  <div className="mt-6 w-full max-w-sm bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest block uppercase mb-1">Ciclador de Participantes</span>
                    <div className="h-8 flex items-center justify-center">
                      <p className={`text-md font-black uppercase tracking-wide truncate ${activeBrandStyles.textAccent}`}>
                        {isSpinning ? cyclingName : '¡Presiona girar para sortear!'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de Giro Adaptable */}
              <div className="w-full max-w-sm mt-4">
                <button 
                  onClick={spinTheWheel}
                  disabled={isSpinning || activePoolForDraw.length === 0}
                  className={`w-full py-4 rounded-xl font-black tracking-widest text-sm uppercase transition duration-300 transform active:scale-95 shadow-xl ${
                    isSpinning 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                      : activePoolForDraw.length === 0 
                        ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                        : `bg-gradient-to-r text-slate-950 hover:shadow-lg ${activeBrandStyles.gradient} ${activeBrandStyles.hoverGradient} ${activeBrandStyles.shadowAccent}`
                  }`}
                >
                  {isSpinning 
                    ? '¡GIRANDO RÁPIDAMENTE!' 
                    : activePoolForDraw.length === 0 
                      ? 'Faltan Inscritos para Iniciar' 
                      : '🔥 ¡GIRAR RULETA AHORA! 🔥'
                  }
                </button>
              </div>
            </div>

            {/* Sidebar de Bombo de Participantes / Bombo de Ganadores en Nube */}
            <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
              <div>
                {sorteoActive ? (
                  <div className="space-y-4">
                    {/* Encabezado del Sorteo Especial */}
                    <div className="border-b border-slate-800 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-white uppercase tracking-wider text-sm flex items-center gap-2">
                          <Award className={`w-4.5 h-4.5 ${activeBrandStyles.textAccent}`} />
                          Sorteo Acumulativo
                        </h4>
                        <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full animate-pulse">
                          Auto-Guardado
                        </span>
                      </div>
                      
                      {/* Indicador de estado del sorteo */}
                      <p className="text-xs text-slate-400 mt-2">
                        Los ganadores se están persistiendo de forma segura en Google Cloud. Puedes salir o recargar la página y tu sorteo se mantendrá intacto.
                      </p>
                    </div>

                    {/* BOMBO DE GANADORES SELECCIONADOS */}
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase flex items-center gap-1.5 mb-2.5">
                        🏆 GANADORES REGISTRADOS ({sorteoWinners.length})
                      </span>
                      <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                        {sorteoWinners.length > 0 ? (
                          sorteoWinners.map((winner, idx) => (
                            <div 
                              key={winner.id || idx}
                              className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs animate-fade-in"
                            >
                              <div className="font-black text-amber-200 flex items-center gap-2">
                                <span className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[9px] uppercase">
                                  GANADOR #{idx + 1}
                                </span>
                                {winner.nombreCompleto}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {winner.documento}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
                            Aún no hay ganadores. ¡Gira la ruleta para elegir al primero!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CANDIDATOS RESTANTES EN LA RULETA */}
                    <div className="pt-4 border-t border-slate-800/60">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-2">
                        👥 CANDIDATOS EN COLA ({sorteoCandidates.length})
                      </span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {sorteoCandidates.map((p, idx) => (
                          <div 
                            key={p.id || idx}
                            className="flex items-center justify-between bg-slate-950/40 border border-slate-800/50 p-2 rounded-lg text-xs text-slate-300"
                          >
                            <span className="font-semibold truncate max-w-[180px]">{p.nombreCompleto}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{p.documento}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Pantalla estándar de Bombo General */}
                    <h4 className="font-black text-white border-b border-slate-800 pb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                      <Award className={`w-4.5 h-4.5 ${activeBrandStyles.textAccent}`} />
                      Bombo de Participantes ({roulettePool.length})
                    </h4>
                    
                    <p className="text-xs text-slate-400 my-3">
                      Solo las personas registradas en el torneo seleccionado ingresarán al sorteo dinámico actual.
                    </p>

                    {/* Botón de Llamado a la Acción para iniciar sorteo persistente */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center my-4 animate-fade-in">
                      <Sparkles className={`w-8 h-8 mx-auto mb-2 ${activeBrandStyles.textAccent} animate-pulse`} />
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">Sorteo con Respaldo en la Nube</h5>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3.5 leading-normal">
                        Cada ganador se guardará automáticamente en Firestore. El sistema los descartará del bombo para que no salgan repetidos.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartSorteoSession}
                        className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r ${activeBrandStyles.gradient} ${activeBrandStyles.hoverGradient} shadow-md transition-all duration-300 hover:scale-[1.01]`}
                      >
                        🚀 Activar Sorteo Persistente
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {roulettePool.length > 0 ? (
                        roulettePool.map((p, idx) => (
                          <div 
                            key={p.id || idx} 
                            className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs animate-fade-in"
                          >
                            <div className="font-bold text-slate-200">{p.nombreCompleto}</div>
                            <div className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded border font-mono tracking-wider ${activeBrandStyles.textAccent} ${activeBrandStyles.bgAccentLight} ${activeBrandStyles.borderAccentLight}`}>
                              {p.documento}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-slate-500 text-xs border-2 border-dashed border-slate-800 rounded-xl">
                          ⚠️ No hay nadie registrado en este evento aún.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pie de controles adaptativos */}
              <div className="pt-6 border-t border-slate-800 mt-6 bg-slate-950/25 p-4 rounded-xl">
                {sorteoActive ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 leading-normal mb-2">
                      Al finalizar y resetear el sorteo, la colección especial de ganadores en la nube se limpiará por completo para este evento.
                    </p>
                    <button
                      type="button"
                      disabled={isSyncingSorteo}
                      onClick={handleFinishSorteoSession}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/50 text-rose-400 font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider transition duration-300 disabled:opacity-50"
                    >
                      {isSyncingSorteo ? 'Procesando en la Nube...' : '🛑 Finalizar y Resetear Sorteo'}
                    </button>
                  </div>
                ) : (
                  <>
                    <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Instrucciones de Pantalla</h5>
                    <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
                      <li>Elige el evento para cambiar de marca de forma instantánea.</li>
                      <li>Puedes proyectar este sistema en transmisiones en directo o pantallas de tarima.</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Gestión de Eventos */}
        {activeTab === 'manage-events' && isAdminAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Formulario de Creación / Edición */}
            <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
              <h3 className="text-md font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                {isEditingEvent ? (
                  <>
                    <Pencil className="w-5 h-5 text-amber-400" /> Editar Evento Configurado
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5 text-cyan-400" /> Registrar Evento Nuevo
                  </>
                )}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Define las características y asócialo a la marca correspondiente para actualizar el catálogo.
              </p>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-400">Nombre del Evento *</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.nombre}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Torneo de Integración Fútsal" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition text-sm"
                  />
                </div>

                {/* Selector de Categoría (Sport / Gaming) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-400">Categoría de la Marca *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewEvent(prev => ({ ...prev, categoria: 'sport' }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        newEvent.categoria === 'sport'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      ⚽ Deporte (Sport)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEvent(prev => ({ ...prev, categoria: 'gaming' }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        newEvent.categoria === 'gaming'
                          ? 'bg-red-950 text-red-500 border-red-500/50'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      🎮 Videojuegos (Gaming)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-400">Descripción Corta</label>
                  <textarea 
                    value={newEvent.descripcion}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Detalles sobre premios, consolas o categorías..." 
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
                        <Plus className="w-4 h-4" /> Registrar Evento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Eventos Creados */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
              <h3 className="text-md font-black text-white uppercase tracking-wider mb-2">
                Eventos Disponibles en la Plataforma ({events.length})
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Lista de actividades asociadas con sincronización instantánea a la nube.
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {events.map((ev) => {
                  const registrations = participants.filter(p => p.evento === ev.nombre).length;
                  const isGaming = ev.categoria === 'gaming';
                  return (
                    <div key={ev.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{ev.nombre}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                            isGaming 
                              ? 'bg-red-950/60 text-red-400 border border-red-900/40' 
                              : 'bg-cyan-950/60 text-cyan-400 border border-cyan-900/40'
                          }`}>
                            {isGaming ? '🎮 Gaming' : '⚽ Sport'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                            ev.activo !== false 
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-900/40' 
                              : 'bg-slate-800 text-slate-400 border border-slate-700/40'
                          }`}>
                            {ev.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{ev.descripcion}</p>
                        <span className="inline-block mt-2 text-[10px] font-mono text-slate-500">
                          ID: <span className="text-slate-400">{ev.id}</span> | Creado: {ev.fechaCreado ? new Date(ev.fechaCreado).toLocaleDateString() : 'Predeterminado'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2">
                          <span className="block text-xs font-bold text-slate-300">{registrations}</span>
                          <span className="text-[9px] text-slate-500 uppercase font-bold">Inscritos</span>
                        </div>
                        <button 
                          onClick={() => handleToggleEventActive(ev.id, ev.activo)}
                          className={`p-2 rounded-lg transition ${
                            ev.activo !== false 
                              ? 'text-emerald-400 hover:bg-emerald-500/10' 
                              : 'text-slate-500 hover:bg-slate-500/10'
                          }`}
                          title={ev.activo !== false ? "Pausar inscripciones" : "Activar inscripciones"}
                        >
                          {ev.activo !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
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

        {/* Tab 5: Gestión de Patrocinadores (Marcas Aliadas) con soporte Multievento */}
        {activeTab === 'sponsors' && isAdminAuthenticated && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-fade-in">
            <h3 className="text-white font-black uppercase tracking-wider mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Gestionar Marcas Aliadas (Sponsor Gate)
            </h3>
            
            {/* Formulario para añadir/editar */}
            <form onSubmit={handleSaveSponsor} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 bg-slate-950/40 p-5 rounded-xl border border-slate-800/60">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase text-slate-400">Nombre de la marca *</label>
                <input 
                  type="text" 
                  placeholder="Ej: Gatorade" 
                  value={newSponsor.nombre} 
                  required
                  onChange={(e) => setNewSponsor({...newSponsor, nombre: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase text-slate-400">Enlace web de redirección *</label>
                <input 
                  type="url" 
                  placeholder="Ej: https://instagram.com/gatorade" 
                  value={newSponsor.enlace} 
                  required
                  onChange={(e) => setNewSponsor({...newSponsor, enlace: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase text-slate-400">Tipo de Vinculación de Evento *</label>
                <select 
                  value={newSponsor.vinculacion} 
                  onChange={(e) => setNewSponsor({...newSponsor, vinculacion: e.target.value, eventosIds: e.target.value === 'all' ? [] : newSponsor.eventosIds})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  <option value="all">🌐 Todos los Eventos (Global)</option>
                  <option value="custom">🎯 Eventos Seleccionados (Específico)</option>
                </select>
              </div>

              {/* Casillas para vincular a múltiples eventos de forma independiente */}
              {newSponsor.vinculacion === 'custom' && (
                <div className="col-span-1 md:col-span-3 space-y-2 p-4 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Selecciona uno o varios eventos a los que deseas vincular esta marca aliada:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {events.map((ev) => {
                      const isChecked = newSponsor.eventosIds?.includes(ev.id);
                      return (
                        <label 
                          key={ev.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none ${
                            isChecked 
                              ? 'bg-slate-900 border-emerald-500/40 text-emerald-400 shadow-inner' 
                              : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const currentList = newSponsor.eventosIds || [];
                              const updated = currentList.includes(ev.id)
                                ? currentList.filter(id => id !== ev.id)
                                : [...currentList, ev.id];
                              setNewSponsor(prev => ({ ...prev, eventosIds: updated }));
                            }}
                            className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 w-4.5 h-4.5"
                          />
                          <span className="text-xs font-semibold truncate">{ev.nombre}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="col-span-1 md:col-span-3 flex justify-end">
                <button 
                  type="submit" 
                  className={`font-black rounded-lg text-slate-950 hover:opacity-90 transition-all shadow-md text-xs py-3 px-6 uppercase ${
                    isEditingSponsor 
                      ? 'bg-amber-500' 
                      : `bg-gradient-to-r ${activeBrandStyles.gradient}`
                  }`}
                >
                  {isEditingSponsor ? 'Actualizar Marca' : 'Añadir Marca'}
                </button>
              </div>
            </form>

            {/* Lista de Marcas */}
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Marcas Registradas</h4>
            <div className="space-y-3">
              {sponsorsList.map(sponsor => (
                <div key={sponsor.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-white font-bold block text-sm">{sponsor.nombre}</span>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <a href={sponsor.enlace} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline truncate max-w-xs block mr-2">
                        {sponsor.enlace}
                      </a>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        sponsor.vinculacion === 'all' || !sponsor.vinculacion
                          ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/40'
                          : 'bg-sky-950/20 text-sky-400 border-sky-900/40'
                      }`}>
                        {sponsor.vinculacion === 'all' || !sponsor.vinculacion ? '🌐 Global (Todos los eventos)' : `🎯 Específico (${sponsor.eventosIds?.length || 0} Eventos)`}
                      </span>
                    </div>

                    {sponsor.vinculacion === 'custom' && sponsor.eventosIds && sponsor.eventosIds.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {sponsor.eventosIds.map(evId => {
                          const ev = events.find(e => e.id === evId);
                          return (
                            <span key={evId} className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 border border-slate-800">
                              {ev ? ev.nombre : `ID: ${evId}`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleEditSponsor(sponsor)} 
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase transition"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => setDeleteSponsorTarget({ id: sponsor.id, nombre: sponsor.nombre })} 
                      className="text-rose-500 hover:text-rose-400 text-xs font-bold uppercase transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {sponsorsList.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No hay marcas aliadas registradas.</p>
              )}
            </div>
          </div>
        )}
  
      </main>

      {/* MODAL 1: Autenticación de Organizador */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Lock className={`w-5 h-5 ${activeBrandStyles.textAccent}`} />
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
              Ingresa la contraseña maestra para habilitar las opciones avanzadas de administración, sorteos en vivo y control de marcas.
            </p>

            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Contraseña de Administrador</label>
                <input 
                  type="password" 
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Introduce la contraseña" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400 transition"
                  autoFocus
                />
                {adminError && <p className="text-xs text-rose-400 mt-1 font-semibold">{adminError}</p>}
              </div>

              <button 
                type="submit"
                className={`w-full text-slate-950 font-black tracking-wider text-xs py-3 rounded-lg uppercase transition-all duration-300 bg-gradient-to-r ${activeBrandStyles.gradient} ${activeBrandStyles.hoverGradient}`}
              >
                Validar Credencial
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Celebración del Ganador Adaptable */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className={`bg-slate-900 border-2 rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center relative overflow-hidden transition-all duration-500 ${activeBrand === 'sport' ? 'border-cyan-400' : 'border-red-500'}`}>
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${activeBrandStyles.gradient}`}></div>
            
            <div className="my-4">
              <span className="text-5xl block animate-bounce">🏆</span>
            </div>

            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest border ${activeBrandStyles.glowBg} ${activeBrandStyles.textAccent} ${activeBrandStyles.borderAccent}`}>
              ¡TENEMOS UN GANADOR DEL SORTEO!
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight uppercase break-words px-2">
              {winnerName}
            </h2>

            {winnerDoc && (
              <div className={`mt-2.5 inline-flex items-center gap-1.5 bg-slate-950/60 border px-4 py-1.5 rounded-full text-xs font-mono font-bold shadow-inner ${activeBrandStyles.textAccent} ${activeBrandStyles.borderAccentLight}`}>
                <span>Documento:</span>
                <span className="tracking-wider">•••• {winnerDoc.trim().slice(-4)}</span>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4 max-w-sm mx-auto">
              Ganador seleccionado de manera aleatoria, transparente y auditada en la ruleta de Llano Torneo {activeBrandStyles.title}. ¡Felicitaciones!
            </p>

            <div className="mt-8 flex flex-col gap-2 max-w-xs mx-auto">
              <button 
                onClick={() => {
                  setShowWinnerModal(false);
                  setWinnerDoc('');
                }}
                className={`w-full text-slate-950 font-black text-xs py-3.5 rounded-xl uppercase tracking-wider transition duration-300 shadow-lg bg-gradient-to-r ${activeBrandStyles.gradient} ${activeBrandStyles.hoverGradient} ${activeBrandStyles.shadowAccent}`}
              >
                Cerrar y Seguir Sorteos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Eliminar Participante */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-md font-bold text-white mb-2 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Confirmar Eliminación
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              ¿Estás seguro de que deseas eliminar permanentemente la inscripción de <span className={`font-bold ${activeBrandStyles.textAccent}`}>"{deleteTargetName}"</span>? Se borrará de la ruleta actual.
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

      {/* MODAL 4: Eliminar Evento */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-md font-bold text-white mb-2 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Eliminar Evento Oficial
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              ¿Estás absolutamente seguro de que deseas eliminar permanentemente el evento <span className="text-cyan-400 font-bold">"{deleteEventTarget.nombre}"</span>? Esta acción no se puede deshacer.
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

      {/* MODAL 5: Eliminar Marca Aliada */}
      {deleteSponsorTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-md font-bold text-white mb-2 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Confirmar Eliminación de Marca
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              ¿Estás seguro de que deseas eliminar permanentemente la marca aliada <span className={`font-bold ${activeBrandStyles.textAccent}`}>"{deleteSponsorTarget.nombre}"</span>? Ya no se requerirá seguirla para los eventos vinculados.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteSponsorTarget(null)}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  await handleDeleteSponsor(deleteSponsorTarget.id);
                  setDeleteSponsorTarget(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-lg text-xs font-semibold text-white transition"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Marcas Aliadas en Registro */}
      {showSponsorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Marcas Aliadas</h3>
              <button 
                type="button"
                onClick={() => setShowSponsorsModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              Haz clic en los enlaces de nuestros patrocinadores para desbloquear tu registro para este evento:
            </p>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {filteredSponsorsForRegister.map(sponsor => (
                <button
                  key={sponsor.id}
                  type="button"
                  onClick={() => handleFollowClick(sponsor.id, sponsor.enlace)}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all text-left ${
                    followedSponsors.includes(sponsor.id)
                      ? 'bg-emerald-950/20 border-emerald-500/50'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:scale-[1.01]'
                  }`}
                >
                  <span className="font-bold text-white">{sponsor.nombre}</span>
                  {followedSponsors.includes(sponsor.id) ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-xs font-bold bg-slate-700 px-2.5 py-1 rounded text-slate-300">VISITAR</span>
                  )}
                </button>
              ))}
            </div>
            
            <button 
              type="button"
              onClick={() => setShowSponsorsModal(false)}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      )}

      {/* Pie de Página adaptable */}
      <footer className="bg-slate-900 border-t border-slate-800/60 py-8 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Llano Torneo Sport & Llano Torneo Gaming. Todos los derechos reservados.
          </p>
          <p className="text-[10px] text-slate-600 mt-2">
            Base de datos y eventos en tiempo real unificados con persistencia en Google Cloud Firestore.
          </p>
        </div>
      </footer>

    </div>
  );
}