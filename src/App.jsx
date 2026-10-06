import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Camera,
  ChevronDown,
  CircleHelp,
  Contact,
  Download,
  Globe2,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import './App.css';

const QR_TYPES = [
  { id: 'url', label: 'Website', icon: Globe2 },
  { id: 'text', label: 'Text', icon: MessageCircle },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'sms', label: 'SMS', icon: Smartphone },
  { id: 'vcard', label: 'Contact', icon: Contact },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'event', label: 'Event', icon: Sparkles },
  { id: 'social', label: 'Social', icon: Globe2 },
];

const EMPTY_DATA = {
  url: { url: '' },
  text: { text: '' },
  wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
  email: { email: '', subject: '', body: '' },
  phone: { phone: '' },
  sms: { phone: '', message: '' },
  vcard: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    organization: '',
  },
  location: { latitude: '', longitude: '', label: '' },
  whatsapp: { phone: '', message: '' },
  event: { title: '', start: '', end: '', location: '', description: '' },
  social: { platform: 'Instagram', url: '' },
};

const PAGE_INFO = {
  '/qr-code-generator': [
    'QR Code Generator Online | Signal QR',
    'Create a free QR code generator online with customizable color, size, and format.',
  ],
  '/wifi-qr-code': [
    'Wi-Fi QR Code Generator | Signal QR',
    'Make a Wi-Fi QR code so guests can join your network with a quick scan.',
  ],
  '/url-qr-code': [
    'URL QR Code Generator | Signal QR',
    'Generate a QR code for a website URL and customize its appearance.',
  ],
  '/whatsapp-qr-code': [
    'WhatsApp QR Code | Signal QR',
    'Create a WhatsApp QR code that opens a chat with your number.',
  ],
  '/qr-code-scanner': [
    'Online QR Code Scanner | Signal QR',
    'Scan a QR code online using your camera or an uploaded image.',
  ],
};

const PATH_TYPE = {
  '/wifi-qr-code': 'wifi',
  '/url-qr-code': 'url',
  '/whatsapp-qr-code': 'whatsapp',
};

function appUrl(path = '') {
  return `${import.meta.env.BASE_URL}${path}`;
}

function escapeWifi(value) {
  return [...value]
    .map((character) =>
      '\\;,:"'.includes(character) ? `\\${character}` : character,
    )
    .join('');
}

function escapeVCard(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function dateForCalendar(value) {
  if (!value) return '';
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function makePayload(type, values) {
  switch (type) {
    case 'url': {
      const rawUrl = values.url.trim();
      if (!rawUrl) return '';
      const url = /^[a-z][a-z\d+.-]*:/i.test(rawUrl)
        ? rawUrl
        : `https://${rawUrl}`;
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
      } catch {
        return '';
      }
    }
    case 'text':
      return values.text.trim();
    case 'wifi':
      return values.ssid.trim()
        ? `WIFI:T:${values.security};S:${escapeWifi(values.ssid)};P:${escapeWifi(values.password)};H:${values.hidden ? 'true' : 'false'};;`
        : '';
    case 'email': {
      if (!values.email.trim()) return '';
      const query = new URLSearchParams();
      if (values.subject) query.set('subject', values.subject);
      if (values.body) query.set('body', values.body);
      return `mailto:${values.email.trim()}${query.size ? `?${query}` : ''}`;
    }
    case 'phone':
      return values.phone.trim() ? `tel:${values.phone.trim()}` : '';
    case 'sms':
      return values.phone.trim()
        ? `SMSTO:${values.phone.trim()}:${values.message}`
        : '';
    case 'vcard': {
      if (
        !values.firstName.trim() &&
        !values.lastName.trim() &&
        !values.phone.trim() &&
        !values.email.trim()
      )
        return '';
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVCard(values.lastName)};${escapeVCard(values.firstName)};;;`,
        `FN:${escapeVCard(`${values.firstName} ${values.lastName}`.trim())}`,
        ...(values.organization
          ? [`ORG:${escapeVCard(values.organization)}`]
          : []),
        ...(values.phone ? [`TEL;TYPE=CELL:${escapeVCard(values.phone)}`] : []),
        ...(values.email ? [`EMAIL:${escapeVCard(values.email)}`] : []),
        'END:VCARD',
      ].join('\r\n');
    }
    case 'location': {
      const latitude = Number(values.latitude);
      const longitude = Number(values.longitude);
      if (
        !values.latitude ||
        !values.longitude ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      )
        return '';
      return `geo:${latitude},${longitude}${values.label ? `?q=${encodeURIComponent(values.label)}` : ''}`;
    }
    case 'whatsapp': {
      const number = values.phone.replace(/\D/g, '');
      return number
        ? `https://wa.me/${number}${values.message ? `?text=${encodeURIComponent(values.message)}` : ''}`
        : '';
    }
    case 'event': {
      if (!values.title.trim() || !values.start) return '';
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Signal QR//Event QR//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${values.title.replace(/[\r\n]/g, ' ')}`,
        `DTSTART:${dateForCalendar(values.start)}`,
        ...(values.end ? [`DTEND:${dateForCalendar(values.end)}`] : []),
        ...(values.location
          ? [`LOCATION:${values.location.replace(/[\r\n]/g, ' ')}`]
          : []),
        ...(values.description
          ? [`DESCRIPTION:${values.description.replace(/[\r\n]/g, ' ')}`]
          : []),
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
    }
    case 'social': {
      const rawUrl = values.url.trim();
      if (!rawUrl) return '';
      try {
        const parsed = new URL(
          /^[a-z][a-z\d+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`,
        );
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
      } catch {
        return '';
      }
    }
    default:
      return '';
  }
}

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color
      .match(/[\da-f]{2}/gi)
      .map((channel) => parseInt(channel, 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function getFormFields(type, data, update) {
  const field = (key, label, placeholder, options = {}) => (
    <label className="field" key={key}>
      <span>{label}</span>
      {options.multiline ? (
        <textarea
          rows={options.rows ?? 3}
          placeholder={placeholder}
          value={data[key]}
          onChange={(event) => update(key, event.target.value)}
        />
      ) : (
        <input
          type={options.type ?? 'text'}
          placeholder={placeholder}
          value={data[key]}
          onChange={(event) => update(key, event.target.value)}
          autoComplete={options.autoComplete}
        />
      )}
      {options.hint && <small>{options.hint}</small>}
    </label>
  );

  switch (type) {
    case 'url':
      return (
        <>
          {field('url', 'Website address', 'https://example.com', {
            type: 'url',
          })}
        </>
      );
    case 'text':
      return (
        <>
          {field('text', 'Your message', 'Write something worth sharing…', {
            multiline: true,
            rows: 5,
          })}
        </>
      );
    case 'wifi':
      return (
        <>
          {field('ssid', 'Network name', 'e.g. Home Wi-Fi')}
          <label className="field">
            <span>Security</span>
            <select
              value={data.security}
              onChange={(event) => update('security', event.target.value)}
            >
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No password</option>
            </select>
          </label>
          {data.security !== 'nopass' &&
            field('password', 'Network password', 'Enter your Wi-Fi password', {
              type: 'password',
              autoComplete: 'new-password',
            })}
          <label className="check-field">
            <input
              type="checkbox"
              checked={data.hidden}
              onChange={(event) => update('hidden', event.target.checked)}
            />
            <span>Hidden network</span>
          </label>
        </>
      );
    case 'email':
      return (
        <>
          {field('email', 'Email address', 'hello@example.com', {
            type: 'email',
          })}
          {field('subject', 'Subject', 'Hello there')}
          {field('body', 'Message', 'Add a message (optional)', {
            multiline: true,
          })}
        </>
      );
    case 'phone':
      return (
        <>
          {field('phone', 'Phone number', '+1 555 123 4567', { type: 'tel' })}
        </>
      );
    case 'sms':
      return (
        <>
          {field('phone', 'Phone number', '+1 555 123 4567', { type: 'tel' })}
          {field('message', 'Text message', 'Type a message (optional)', {
            multiline: true,
          })}
        </>
      );
    case 'vcard':
      return (
        <>
          {field('firstName', 'First name', 'First')}
          {field('lastName', 'Last name', 'Last')}
          {field('phone', 'Phone number', '+1 555 123 4567', { type: 'tel' })}
          {field('email', 'Email address', 'hello@example.com', {
            type: 'email',
          })}
          {field('organization', 'Organization', 'Company (optional)')}
        </>
      );
    case 'location':
      return (
        <>
          {field('latitude', 'Latitude', '37.7749', { type: 'number' })}
          {field('longitude', 'Longitude', '-122.4194', { type: 'number' })}
          {field('label', 'Place name', 'Optional location label')}
        </>
      );
    case 'whatsapp':
      return (
        <>
          {field('phone', 'WhatsApp number', '15551234567', {
            type: 'tel',
            hint: 'Include the country code, without a + sign.',
          })}
          {field('message', 'Opening message', 'Hi! (optional)', {
            multiline: true,
          })}
        </>
      );
    case 'event':
      return (
        <>
          {field('title', 'Event name', 'Saturday gathering')}
          {field('start', 'Starts', '', { type: 'datetime-local' })}
          {field('end', 'Ends', '', { type: 'datetime-local' })}
          {field('location', 'Location', 'Where it happens')}
          {field('description', 'Description', 'Add event details (optional)', {
            multiline: true,
          })}
        </>
      );
    case 'social':
      return (
        <>
          <label className="field">
            <span>Platform</span>
            <select
              value={data.platform}
              onChange={(event) => update('platform', event.target.value)}
            >
              <option>Instagram</option>
              <option>LinkedIn</option>
              <option>TikTok</option>
              <option>X</option>
              <option>Facebook</option>
              <option>YouTube</option>
            </select>
          </label>
          {field('url', 'Profile link', 'https://instagram.com/yourname', {
            type: 'url',
          })}
        </>
      );
    default:
      return null;
  }
}

function classifyContent(value) {
  const content = value.trim();
  const hasControlCharacters = [...content].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
  if (
    /^(javascript|data|vbscript|file|intent|command|shell|about):/i.test(
      content,
    ) ||
    hasControlCharacters
  ) {
    return {
      kind: 'danger',
      label: 'Potentially unsafe content',
      detail:
        'This QR code contains a blocked scheme or control characters. It will not be opened.',
    };
  }
  try {
    const parsed = new URL(content);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      return { kind: 'url', href: parsed.href, destination: parsed.host };
    return {
      kind: 'danger',
      label: 'Unsupported link type',
      detail: `The ${parsed.protocol} scheme is not opened by Signal QR.`,
    };
  } catch {
    return {
      kind: 'text',
      label: 'Text content',
      detail: 'This content is shown as text and will not be executed.',
    };
  }
}

async function checkLinkSafety(url) {
  if (!['http:', 'https:'].includes(new URL(url).protocol))
    return {
      status: 'blocked',
      message: 'Only HTTP and HTTPS links can be checked.',
    };
  return {
    status: 'unavailable',
    message:
      'Link safety checks are not connected yet. No reputation lookup was performed.',
  };
}

function App() {
  const basePath = import.meta.env.BASE_URL;
  const pathname = window.location.pathname.startsWith(basePath)
    ? `/${window.location.pathname.slice(basePath.length)}`
    : window.location.pathname;
  const path = pathname.replace(/\/$/, '') || '/';
  const initialType = PATH_TYPE[path] ?? 'url';
  const [mode, setMode] = useState(
    path === '/qr-code-scanner' ? 'scan' : 'create',
  );
  const [type, setType] = useState(initialType);
  const [formData, setFormData] = useState(() => structuredClone(EMPTY_DATA));
  const [foreground, setForeground] = useState('#20342d');
  const [background, setBackground] = useState('#ffffff');
  const [size, setSize] = useState(640);
  const [correction, setCorrection] = useState('Q');
  const [margin, setMargin] = useState(4);
  const [moduleStyle, setModuleStyle] = useState('rounded');
  const [logo, setLogo] = useState('');
  const [qr, setQr] = useState(null);
  const [qrError, setQrError] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraMessage, setCameraMessage] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [scanError, setScanError] = useState('');
  const [safetyMessage, setSafetyMessage] = useState('');
  const qrMount = useRef(null);
  const videoRef = useRef(null);
  const cameraControls = useRef(null);
  const cameraSession = useRef(0);
  const reader = useRef(null);

  const payload = useMemo(
    () => makePayload(type, formData[type]),
    [type, formData],
  );
  const contrast = contrastRatio(foreground, background);
  const lowContrast = contrast < 4.5;
  const scanAssessment = scanResult ? classifyContent(scanResult) : null;
  const pageInfo = PAGE_INFO[path];
  const visibleQr = qr?.payload === payload ? qr.instance : null;
  const visibleQrError = qrError?.payload === payload ? qrError.message : '';

  useEffect(() => {
    if (pageInfo) {
      document.title = pageInfo[0];
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', pageInfo[1]);
    } else {
      document.title = 'Signal QR | Create & Scan QR Codes';
    }
  }, [pageInfo]);

  useEffect(() => {
    const target = qrMount.current;
    if (!target) return;
    target.replaceChildren();
    if (!payload) return;
    let cancelled = false;
    import('qr-code-styling')
      .then(({ default: QRCodeStyling }) => {
        if (cancelled) return;
        const instance = new QRCodeStyling({
          width: size,
          height: size,
          type: 'svg',
          data: payload,
          margin,
          qrOptions: { errorCorrectionLevel: correction },
          dotsOptions: { color: foreground, type: moduleStyle },
          cornersSquareOptions: {
            color: foreground,
            type: moduleStyle === 'square' ? 'square' : 'extra-rounded',
          },
          cornersDotOptions: { color: foreground, type: 'dot' },
          backgroundOptions: { color: background },
          ...(logo
            ? {
                image: logo,
                imageOptions: {
                  hideBackgroundDots: true,
                  imageSize: 0.2,
                  margin: 4,
                  crossOrigin: 'anonymous',
                },
              }
            : {}),
        });
        target.replaceChildren();
        instance.append(target);
        setQr({ instance, payload });
      })
      .catch(() => {
        if (!cancelled)
          setQrError({
            payload,
            message:
              'This content could not be encoded. Try shortening it or removing the logo.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    payload,
    foreground,
    background,
    size,
    correction,
    margin,
    moduleStyle,
    logo,
  ]);

  useEffect(() => () => cameraControls.current?.stop(), []);

  function updateField(key, value) {
    setFormData((current) => ({
      ...current,
      [type]: { ...current[type], [key]: value },
    }));
  }

  function changeType(nextType) {
    setType(nextType);
    setFormData((current) => ({
      ...current,
      [nextType]: { ...EMPTY_DATA[nextType] },
    }));
  }

  async function downloadCode(extension) {
    if (!visibleQr) return;
    try {
      await visibleQr.download({ name: 'signal-qr', extension });
    } catch {
      setQrError({
        payload,
        message: `Could not export ${extension.toUpperCase()}. Try another size or simplify the QR code.`,
      });
    }
  }

  async function loadLogo(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setQrError({
        payload,
        message: 'Choose an image file for your QR logo.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.onerror = () =>
      setQrError({
        payload,
        message: 'That image could not be loaded. Try another file.',
      });
    reader.readAsDataURL(file);
  }

  async function startCamera() {
    setCameraMessage('');
    setScanError('');
    setScanResult('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraMessage(
        'Camera access is not available in this browser. Upload an image to scan instead.',
      );
      return;
    }
    const session = ++cameraSession.current;
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      reader.current ??= new BrowserMultiFormatReader();
      setCameraStatus('starting');
      const controls = await reader.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error, activeControls) => {
          if (result) {
            setScanResult(result.getText());
            setSafetyMessage('');
            cameraSession.current += 1;
            activeControls.stop();
            cameraControls.current = null;
            setCameraStatus('idle');
          } else if (error && error.name !== 'NotFoundException') {
            setCameraMessage(
              'Could not read a QR code from this camera feed. Try adjusting the lighting or upload an image.',
            );
          }
        },
      );
      if (session !== cameraSession.current) {
        controls.stop();
        return;
      }
      cameraControls.current = controls;
      setCameraStatus('active');
    } catch (error) {
      if (session !== cameraSession.current) return;
      setCameraStatus('error');
      const message =
        error?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, or upload an image instead.'
          : error?.name === 'NotFoundError'
            ? 'No camera was found. Upload an image to scan instead.'
            : 'Camera could not start. Check browser permissions or upload an image to scan.';
      setCameraMessage(message);
    }
  }

  function stopCamera() {
    cameraSession.current += 1;
    cameraControls.current?.stop();
    cameraControls.current = null;
    setCameraStatus('idle');
  }

  function switchMode(nextMode) {
    if (nextMode !== 'scan') stopCamera();
    setMode(nextMode);
  }

  async function scanImage(file) {
    if (!file) return;
    setScanError('');
    setScanResult('');
    setSafetyMessage('');
    const imageUrl = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      reader.current ??= new BrowserMultiFormatReader();
      const result = await reader.current.decodeFromImageUrl(imageUrl);
      setScanResult(result.getText());
    } catch {
      setScanError(
        'No QR code could be read from this image. Try a sharper, well-lit image with the full code in frame.',
      );
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function runSafetyCheck() {
    if (!scanAssessment?.href) return;
    const result = await checkLinkSafety(scanAssessment.href);
    setSafetyMessage(result.message);
  }

  const cardTitle =
    type === 'url'
      ? 'Website'
      : QR_TYPES.find((item) => item.id === type)?.label;
  const dedicatedHeading = {
    '/qr-code-generator': 'QR code generator',
    '/wifi-qr-code': 'Wi-Fi QR code generator',
    '/url-qr-code': 'URL QR code generator',
    '/whatsapp-qr-code': 'WhatsApp QR code',
    '/qr-code-scanner': 'Online QR code scanner',
  }[path];

  return (
    <main className="min-h-screen w-full app-shell">
      <header className="topbar">
        <a className="brand" href={appUrl()} aria-label="Signal QR home">
          <span className="brand-mark">
            <QrCode size={22} />
          </span>
          <span>
            signal<span className="brand-light">qr</span>
          </span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <button
            className={mode === 'create' ? 'nav-link active' : 'nav-link'}
            onClick={() => switchMode('create')}
          >
            <QrCode size={16} /> Create
          </button>
          <button
            className={mode === 'scan' ? 'nav-link active' : 'nav-link'}
            onClick={() => switchMode('scan')}
          >
            <ScanLine size={16} /> Scan
          </button>
        </nav>
        <span
          className="private-note"
          aria-label="Private by design"
          title="Private by design"
        >
          <ShieldCheck size={15} /> Private by design
        </span>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> FREE QR TOOLS, MADE SIMPLE
          </div>
          <h1>{dedicatedHeading ?? 'Create & Scan QR Codes'}</h1>
          <p>
            Generate customizable QR codes or safely scan one using your phone.
          </p>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <span>MAKE IT</span>
          <QrCode size={43} strokeWidth={1.5} />
          <span>SCANNABLE</span>
        </div>
      </section>

      <div className="mode-cards" aria-label="Choose a QR tool">
        <button
          className={`mode-card ${mode === 'create' ? 'selected' : ''}`}
          onClick={() => switchMode('create')}
        >
          <span className="mode-icon create-icon">
            <QrCode size={23} />
          </span>
          <span className="mode-copy">
            <strong>Create QR Code</strong>
            <small>Make a code that looks like you</small>
          </span>
          <ArrowUpRight className="mode-arrow" size={19} />
        </button>
        <button
          className={`mode-card ${mode === 'scan' ? 'selected' : ''}`}
          onClick={() => switchMode('scan')}
        >
          <span className="mode-icon scan-icon">
            <ScanLine size={23} />
          </span>
          <span className="mode-copy">
            <strong>Scan QR Code</strong>
            <small>Use your camera or an image</small>
          </span>
          <ArrowUpRight className="mode-arrow" size={19} />
        </button>
      </div>

      {mode === 'create' ? (
        <section className="workspace" aria-label="QR code generator">
          <div className="workspace-header">
            <div>
              <span className="step-label">01 / CREATE</span>
              <h2>Your QR code</h2>
            </div>
            <span className="local-badge">
              <span /> Generated on this device
            </span>
          </div>
          <div className="type-grid" role="group" aria-label="QR code type">
            {QR_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => changeType(id)}
                className={`type-option ${type === id ? 'active' : ''}`}
                aria-pressed={type === id}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="builder-grid">
            <div className="builder-controls">
              <div className="section-heading">
                <div>
                  <span className="step-label">CONTENT</span>
                  <h3>{cardTitle} details</h3>
                </div>
                <ChevronDown size={18} />
              </div>
              <div className="form-grid">
                {getFormFields(type, formData[type], updateField)}
              </div>

              <div className="section-heading customization-heading">
                <div>
                  <span className="step-label">MAKE IT YOURS</span>
                  <h3>Customize</h3>
                </div>
                <Sparkles size={17} />
              </div>
              <div className="color-row">
                <label className="color-control">
                  <span>Foreground</span>
                  <span className="color-input">
                    <input
                      type="color"
                      value={foreground}
                      onChange={(event) => setForeground(event.target.value)}
                      aria-label="QR foreground color"
                    />
                    <code>{foreground.toUpperCase()}</code>
                  </span>
                </label>
                <label className="color-control">
                  <span>Background</span>
                  <span className="color-input">
                    <input
                      type="color"
                      value={background}
                      onChange={(event) => setBackground(event.target.value)}
                      aria-label="QR background color"
                    />
                    <code>{background.toUpperCase()}</code>
                  </span>
                </label>
              </div>
              <label className="range-control">
                <span>
                  Download size <strong>{size} px</strong>
                </span>
                <input
                  type="range"
                  min="256"
                  max="1200"
                  step="16"
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
                <span className="range-ends">
                  <small>256 px</small>
                  <small>1200 px</small>
                </span>
              </label>
              <div className="select-row">
                <label className="field">
                  <span>
                    Error correction{' '}
                    <span title="Higher correction tolerates more damage but makes the QR pattern denser.">
                      <CircleHelp size={13} />
                    </span>
                  </span>
                  <select
                    value={correction}
                    onChange={(event) => setCorrection(event.target.value)}
                  >
                    <option value="L">Low · 7%</option>
                    <option value="M">Medium · 15%</option>
                    <option value="Q">High · 25%</option>
                    <option value="H">Highest · 30%</option>
                  </select>
                </label>
                <label className="field">
                  <span>
                    Quiet zone <strong>{margin}</strong>
                  </span>
                  <select
                    value={margin}
                    onChange={(event) => setMargin(Number(event.target.value))}
                  >
                    <option value="0">0 modules</option>
                    <option value="2">2 modules</option>
                    <option value="4">4 modules</option>
                    <option value="8">8 modules</option>
                  </select>
                </label>
              </div>
              <fieldset className="style-fieldset">
                <legend>Module style</legend>
                <div className="style-options">
                  {[
                    ['square', 'Square'],
                    ['rounded', 'Rounded'],
                    ['dots', 'Dots'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`style-option ${moduleStyle === id ? 'active' : ''}`}
                      onClick={() => setModuleStyle(id)}
                      aria-pressed={moduleStyle === id}
                    >
                      <span className={`style-sample ${id}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="logo-row">
                <div className="logo-copy">
                  <ImagePlus size={18} />
                  <span>
                    <strong>Add a logo</strong>
                    <small>Keep it small for reliable scans</small>
                  </span>
                </div>
                <label className="upload-logo">
                  {logo ? 'Change' : 'Choose image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => loadLogo(event.target.files?.[0])}
                  />
                </label>
                {logo && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove logo"
                    onClick={() => setLogo('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <aside className="preview-panel" aria-label="Live QR preview">
              <div className="preview-heading">
                <span>LIVE PREVIEW</span>
                <span className="preview-live">
                  <span /> LIVE
                </span>
              </div>
              <div className="qr-stage">
                <div
                  className={`qr-output ${payload && !visibleQrError ? 'has-code' : ''}`}
                >
                  <div className="qr-mount" ref={qrMount} />
                  {!payload && (
                    <div className="qr-empty">
                      <QrCode size={39} strokeWidth={1.4} />
                      <span>Your QR appears here</span>
                      <small>Enter content to get started</small>
                    </div>
                  )}
                </div>
              </div>
              {lowContrast && payload && (
                <p className="warning">
                  <CircleHelp size={15} /> Low contrast may make this code hard
                  to scan. Choose darker foreground and lighter background
                  colors.
                </p>
              )}
              {logo && correction !== 'H' && payload && (
                <p className="warning">
                  <CircleHelp size={15} /> A logo can reduce scan reliability.
                  Highest error correction is recommended.
                </p>
              )}
              {margin < 2 && payload && (
                <p className="warning">
                  <CircleHelp size={15} /> A quiet zone of at least 2 modules
                  helps scanners find the code.
                </p>
              )}
              {moduleStyle === 'dots' && correction === 'L' && payload && (
                <p className="warning">
                  <CircleHelp size={15} /> Dots with low error correction may be
                  difficult for some cameras to scan.
                </p>
              )}
              {visibleQrError && (
                <p className="error-message" role="alert">
                  {visibleQrError}
                </p>
              )}
              <div className="preview-caption">
                <span>
                  {payload ? `${cardTitle} QR code` : 'Waiting for content'}
                </span>
                <span>
                  <span className="online-dot" /> PNG · SVG
                </span>
              </div>
              <div className="download-row">
                <button
                  type="button"
                  className="download-primary"
                  onClick={() => downloadCode('png')}
                  disabled={!visibleQr || Boolean(visibleQrError)}
                >
                  <ArrowDownToLine size={17} /> Download PNG
                </button>
                <button
                  type="button"
                  className="download-secondary"
                  onClick={() => downloadCode('svg')}
                  disabled={!visibleQr || Boolean(visibleQrError)}
                >
                  <Download size={16} /> SVG
                </button>
              </div>
              <p className="export-note">
                {size} × {size} px · {correction} error correction
              </p>
            </aside>
          </div>
        </section>
      ) : (
        <section
          className="workspace scanner-workspace"
          aria-label="QR code scanner"
        >
          <div className="workspace-header">
            <div>
              <span className="step-label">01 / SCAN</span>
              <h2>Scan a QR code</h2>
            </div>
            <span className="local-badge">
              <span /> Scanned on this device
            </span>
          </div>
          <div className="scanner-grid">
            <div className="scanner-inputs">
              <div className="camera-panel">
                <video
                  ref={videoRef}
                  className={`camera-video ${cameraStatus === 'active' ? 'visible' : ''}`}
                  muted
                  playsInline
                  aria-label="Camera view for QR scanning"
                />
                {cameraStatus !== 'active' && (
                  <div className="camera-placeholder">
                    <span className="camera-icon">
                      <Camera size={25} />
                    </span>
                    <strong>Scan with your camera</strong>
                    <span>Allow camera access when your browser asks.</span>
                  </div>
                )}
                {cameraStatus === 'active' && (
                  <span className="scanning-pill">
                    <span /> Looking for a QR code
                  </span>
                )}
              </div>
              {cameraMessage && (
                <p className="error-message" role="status">
                  {cameraMessage}
                </p>
              )}
              <button
                className={
                  cameraStatus === 'active'
                    ? 'camera-button stop'
                    : 'camera-button'
                }
                onClick={cameraStatus === 'active' ? stopCamera : startCamera}
                disabled={cameraStatus === 'starting'}
              >
                {cameraStatus === 'active' ? (
                  <>
                    <X size={17} /> Stop camera
                  </>
                ) : (
                  <>
                    <Camera size={17} />{' '}
                    {cameraStatus === 'starting'
                      ? 'Starting camera…'
                      : 'Start camera'}
                  </>
                )}
              </button>
              <div className="upload-divider">
                <span />
                or scan from an image
                <span />
              </div>
              <label className="image-drop">
                <ImagePlus size={19} />
                <span>
                  <strong>Choose an image</strong>
                  <small>PNG, JPG, GIF, WebP</small>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => scanImage(event.target.files?.[0])}
                />
              </label>
              {scanError && (
                <p className="error-message" role="alert">
                  {scanError}
                </p>
              )}
            </div>
            <div className="scan-result-panel">
              <div className="section-heading">
                <div>
                  <span className="step-label">SCAN RESULT</span>
                  <h3>
                    {scanResult ? scanAssessment.label : 'Nothing scanned yet'}
                  </h3>
                </div>
                {scanResult && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Clear scan result"
                    onClick={() => {
                      setScanResult('');
                      setSafetyMessage('');
                    }}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
              {!scanResult ? (
                <div className="result-empty">
                  <ScanLine size={32} />
                  <span>Your result will appear here</span>
                  <small>Scanned content is never opened automatically.</small>
                </div>
              ) : (
                <div className="result-content">
                  {scanAssessment.kind === 'url' ? (
                    <>
                      <span className="result-label">DESTINATION</span>
                      <code className="destination">{scanAssessment.href}</code>
                      <div className="result-actions">
                        <a
                          className="open-link"
                          href={scanAssessment.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowUpRight size={16} /> Open link
                        </a>
                        <button
                          className="safety-button"
                          onClick={runSafetyCheck}
                        >
                          <ShieldCheck size={16} /> Check link safety
                        </button>
                      </div>
                      <p className="safety-message" role="status">
                        {safetyMessage ||
                          'Links are not checked automatically.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <span
                        className={
                          scanAssessment.kind === 'danger'
                            ? 'result-label danger-label'
                            : 'result-label'
                        }
                      >
                        {scanAssessment.kind === 'danger'
                          ? 'SAFETY WARNING'
                          : 'SCANNED TEXT'}
                      </span>
                      <p
                        className={
                          scanAssessment.kind === 'danger'
                            ? 'danger-copy'
                            : 'plain-content'
                        }
                      >
                        {scanAssessment.kind === 'danger'
                          ? scanAssessment.detail
                          : scanResult}
                      </p>
                      {scanAssessment.kind === 'danger' && (
                        <p className="plain-content">{scanResult}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="scanner-privacy">
            <ShieldCheck size={15} /> Your camera and images are processed
            locally in your browser.
          </p>
        </section>
      )}

      <footer className="site-footer">
        <a className="footer-brand" href={appUrl()}>
          signal<span>qr</span>
        </a>
        <div className="footer-links" aria-label="QR tools">
          <a href={appUrl('qr-code-generator')}>QR code generator</a>
          <a href={appUrl('wifi-qr-code')}>Wi-Fi QR code</a>
          <a href={appUrl('url-qr-code')}>URL QR code</a>
          <a href={appUrl('whatsapp-qr-code')}>WhatsApp QR code</a>
          <a href={appUrl('qr-code-scanner')}>QR code scanner</a>
        </div>
        <span className="footer-note">
          Useful by design. Private by default.
        </span>
      </footer>
    </main>
  );
}

export default App;
