// src/components/ComplianceFormEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

// Material-UI Icons
import TextFieldsIcon from '@mui/icons-material/TextFields';
import GestureIcon from '@mui/icons-material/Gesture';
import UploadIcon from '@mui/icons-material/Upload';
import SaveIcon from '@mui/icons-material/Save';
import GetAppIcon from '@mui/icons-material/GetApp';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

// Form presets with pre-configured blank fields for each compliance document
const FORM_FIELD_PRESETS = {
  accomplishment: [
    { id: 'f_name', label: 'Employee Name', xPercent: 22, yPercent: 14.5, widthPercent: 35, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_pos', label: 'Position / Title', xPercent: 65, yPercent: 14.5, widthPercent: 28, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_dept', label: 'Department / Office', xPercent: 22, yPercent: 18.2, widthPercent: 35, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_period', label: 'Period Covered', xPercent: 65, yPercent: 18.2, widthPercent: 28, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_task1', label: 'Target / Output 1', xPercent: 8, yPercent: 28.5, widthPercent: 42, heightPercent: 4.5, text: '', fontSize: 10, multiline: true },
    { id: 'f_acc1', label: 'Actual Accomplishment 1', xPercent: 52, yPercent: 28.5, widthPercent: 42, heightPercent: 4.5, text: '', fontSize: 10, multiline: true },
    { id: 'f_task2', label: 'Target / Output 2', xPercent: 8, yPercent: 35.5, widthPercent: 42, heightPercent: 4.5, text: '', fontSize: 10, multiline: true },
    { id: 'f_acc2', label: 'Actual Accomplishment 2', xPercent: 52, yPercent: 35.5, widthPercent: 42, heightPercent: 4.5, text: '', fontSize: 10, multiline: true },
    { id: 'f_task3', label: 'Target / Output 3', xPercent: 8, yPercent: 42.5, widthPercent: 42, heightPercent: 4.5, text: '', fontSize: 10, multiline: true },
    { id: 'f_acc3', label: 'Actual Accomplishment 3', xPercent: 52, yPercent: 42.5, widthPercent: 42, heightPercent: 4.5, text: '', fontSize: 10, multiline: true },
    { id: 'f_date_sign', label: 'Date Signed', xPercent: 68, yPercent: 88.0, widthPercent: 24, heightPercent: 2.5, text: '', fontSize: 10 }
  ],
  passSlip: [
    { id: 'f_name', label: 'Employee Name', xPercent: 20, yPercent: 18.0, widthPercent: 40, heightPercent: 3.2, text: '', fontSize: 11 },
    { id: 'f_date', label: 'Date', xPercent: 68, yPercent: 18.0, widthPercent: 24, heightPercent: 3.2, text: '', fontSize: 11 },
    { id: 'f_dept', label: 'Office / Department', xPercent: 20, yPercent: 23.0, widthPercent: 40, heightPercent: 3.2, text: '', fontSize: 11 },
    { id: 'f_time_out', label: 'Time of Departure', xPercent: 68, yPercent: 23.0, widthPercent: 24, heightPercent: 3.2, text: '', fontSize: 11 },
    { id: 'f_dest', label: 'Destination', xPercent: 20, yPercent: 28.5, widthPercent: 72, heightPercent: 3.2, text: '', fontSize: 11 },
    { id: 'f_purpose', label: 'Purpose / Reason of Pass Slip', xPercent: 20, yPercent: 34.0, widthPercent: 72, heightPercent: 8.0, text: '', fontSize: 11, multiline: true },
    { id: 'f_exp_return', label: 'Expected Time of Return', xPercent: 35, yPercent: 44.5, widthPercent: 57, heightPercent: 3.2, text: '', fontSize: 11 }
  ],
  ipcr: [
    { id: 'f_name', label: 'Employee Name', xPercent: 22, yPercent: 15.0, widthPercent: 38, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_pos', label: 'Position', xPercent: 66, yPercent: 15.0, widthPercent: 26, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_div', label: 'Division / Section', xPercent: 22, yPercent: 18.5, widthPercent: 38, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_period', label: 'Review Period', xPercent: 66, yPercent: 18.5, widthPercent: 26, heightPercent: 2.8, text: '', fontSize: 11 },
    { id: 'f_obj1', label: 'Major Final Output 1', xPercent: 6, yPercent: 28.0, widthPercent: 28, heightPercent: 5.0, text: '', fontSize: 9.5, multiline: true },
    { id: 'f_ind1', label: 'Performance Indicator 1', xPercent: 35, yPercent: 28.0, widthPercent: 25, heightPercent: 5.0, text: '', fontSize: 9.5, multiline: true },
    { id: 'f_acc1', label: 'Actual Accomplishments 1', xPercent: 61, yPercent: 28.0, widthPercent: 25, heightPercent: 5.0, text: '', fontSize: 9.5, multiline: true },
    { id: 'f_rate1', label: 'Rating 1', xPercent: 87, yPercent: 28.0, widthPercent: 8, heightPercent: 5.0, text: '', fontSize: 10 }
  ],
  pds: [
    { id: 'f_surname', label: '1. CS Form - Surname', xPercent: 25, yPercent: 13.5, widthPercent: 30, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_firstname', label: 'First Name', xPercent: 57, yPercent: 13.5, widthPercent: 30, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_dob', label: '2. Date of Birth (mm/dd/yyyy)', xPercent: 25, yPercent: 16.5, widthPercent: 20, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_pob', label: '3. Place of Birth', xPercent: 48, yPercent: 16.5, widthPercent: 42, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_sex', label: '4. Sex', xPercent: 25, yPercent: 19.5, widthPercent: 15, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_civil', label: '5. Civil Status', xPercent: 45, yPercent: 19.5, widthPercent: 18, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_citiz', label: '6. Citizenship', xPercent: 68, yPercent: 19.5, widthPercent: 22, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_addr', label: '7. Residential Address', xPercent: 25, yPercent: 23.0, widthPercent: 65, heightPercent: 3.5, text: '', fontSize: 9.5, multiline: true },
    { id: 'f_tel', label: '8. Telephone / Mobile No.', xPercent: 25, yPercent: 27.5, widthPercent: 30, heightPercent: 2.4, text: '', fontSize: 10 },
    { id: 'f_email', label: '9. Email Address', xPercent: 58, yPercent: 27.5, widthPercent: 32, heightPercent: 2.4, text: '', fontSize: 10 }
  ],
  saln: [
    { id: 'f_declarant', label: 'Declarant Name', xPercent: 20, yPercent: 14.0, widthPercent: 40, heightPercent: 2.6, text: '', fontSize: 10 },
    { id: 'f_pos', label: 'Position', xPercent: 66, yPercent: 14.0, widthPercent: 28, heightPercent: 2.6, text: '', fontSize: 10 },
    { id: 'f_agency', label: 'Agency / Office', xPercent: 20, yPercent: 17.2, widthPercent: 40, heightPercent: 2.6, text: '', fontSize: 10 },
    { id: 'f_office_addr', label: 'Office Address', xPercent: 66, yPercent: 17.2, widthPercent: 28, heightPercent: 2.6, text: '', fontSize: 10 },
    { id: 'f_as_of', label: 'As of Date', xPercent: 40, yPercent: 10.5, widthPercent: 30, heightPercent: 2.6, text: '', fontSize: 10 }
  ]
};

function ComplianceFormEditor({ form, employee, onClose, onSaveSuccess }) {
  // Document state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'addText'
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Text formatting
  const [activeFontSize, setActiveFontSize] = useState(11);
  const [activeTextColor] = useState('#1a202c');

  // Signature state
  const [signatureImage, setSignatureImage] = useState(null);
  const [signaturePos, setSignaturePos] = useState({ xPercent: 65, yPercent: 82 });
  const [signatureSize, setSignatureSize] = useState({ widthPercent: 22, heightPercent: 6.5 });
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const [isResizingSig, setIsResizingSig] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, origW: 0, origH: 0 });
  const [showDrawPadModal, setShowDrawPadModal] = useState(false);

  // Drawing pad state
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [penColor, setPenColor] = useState('#0a2540');
  const [penWidth, setPenWidth] = useState(2.5);

  // References
  const docContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load form fields on mount
  useEffect(() => {
    loadFormData();
  }, [form.id, employee?.id]);

  const loadFormData = () => {
    try {
      const storageKey = `compliance_form_${form.id}_${employee?.id || 'guest'}`;
      let initialFields = [];

      // Check presets first
      const defaultPresets = (FORM_FIELD_PRESETS[form.id] || []).map(preset => {
        let defaultVal = '';
        if (preset.id === 'f_name' || preset.id === 'f_declarant') {
          defaultVal = employee?.fullName || '';
        } else if (preset.id === 'f_dept' || preset.id === 'f_agency' || preset.id === 'f_div') {
          defaultVal = employee?.department || '';
        } else if (preset.id === 'f_pos') {
          defaultVal = employee?.position || '';
        } else if (preset.id === 'f_email') {
          defaultVal = employee?.email || '';
        } else if (preset.id === 'f_tel') {
          defaultVal = employee?.phone || '';
        } else if (preset.id === 'f_date' || preset.id === 'f_date_sign' || preset.id === 'f_as_of') {
          defaultVal = new Date().toLocaleDateString('en-US');
        }
        return { ...preset, text: defaultVal };
      });

      // Try reading local storage
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed.fields && Array.isArray(parsed.fields)) {
            initialFields = parsed.fields;
          }
          if (parsed.signature) {
            setSignatureImage(parsed.signature.image || null);
            if (parsed.signature.pos) setSignaturePos(parsed.signature.pos);
            if (parsed.signature.size) setSignatureSize(parsed.signature.size);
          }
        } catch (e) {
          console.warn('Could not parse local form data', e);
        }
      }

      // Also check if there's a saved signature profile in localStorage
      if (!signatureImage) {
        const savedGlobalSig = localStorage.getItem('savedSignature');
        if (savedGlobalSig) {
          try {
            const parsedSig = JSON.parse(savedGlobalSig);
            if (parsedSig.preview) {
              setSignatureImage(parsedSig.preview);
            }
          } catch (e) {}
        }
      }

      // If no custom saved fields, use defaults with employee data
      if (initialFields.length === 0) {
        initialFields = defaultPresets;
      }

      setFields(initialFields);
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  // Add a new text field on click
  const handleContainerClick = (e) => {
    if (activeTool !== 'addText') return;
    if (!docContainerRef.current) return;

    const rect = docContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    const newField = {
      id: `custom_${Date.now()}`,
      label: 'Text Box',
      xPercent: Math.max(0, Math.min(85, xPercent)),
      yPercent: Math.max(0, Math.min(95, yPercent)),
      widthPercent: 25,
      heightPercent: 3.2,
      text: '',
      fontSize: activeFontSize,
      color: activeTextColor,
      isCustom: true
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setActiveTool('select');
  };

  // Update text field value
  const handleFieldTextChange = (id, newText) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, text: newText } : f));
  };

  // Delete selected field
  const handleDeleteField = (id, e) => {
    if (e) e.stopPropagation();
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // Auto-fill employee details
  const autoFillEmployeeDetails = () => {
    setFields(prev => prev.map(f => {
      let val = f.text;
      if (f.id === 'f_name' || f.id === 'f_declarant') val = employee?.fullName || val;
      if (f.id === 'f_dept' || f.id === 'f_agency' || f.id === 'f_div') val = employee?.department || val;
      if (f.id === 'f_pos') val = employee?.position || val;
      if (f.id === 'f_email') val = employee?.email || val;
      if (f.id === 'f_tel') val = employee?.phone || val;
      if (f.id === 'f_date' || f.id === 'f_date_sign' || f.id === 'f_as_of') val = new Date().toLocaleDateString('en-US');
      return { ...f, text: val };
    }));
    setSaveStatus('Auto-filled employee details');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // ====== DRAWING PAD FUNCTIONS ======
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    isDrawingRef.current = true;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasDrawing = pixelData.some(channel => channel !== 0);

    if (!hasDrawing) {
      alert('Please draw your signature before saving.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImage(dataUrl);
    setShowDrawPadModal(false);

    localStorage.setItem('savedSignature', JSON.stringify({ preview: dataUrl }));
    setSaveStatus('Signature captured!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Handle signature upload from file
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Signature image is too large. Max size is 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureImage(event.target.result);
      localStorage.setItem('savedSignature', JSON.stringify({ preview: event.target.result }));
      setSaveStatus('Signature uploaded!');
      setTimeout(() => setSaveStatus(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Signature mouse interactions for dragging
  const handleSigMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains('sig-resize-handle')) {
      setIsResizingSig(true);
      const containerRect = docContainerRef.current.getBoundingClientRect();
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        origW: (signatureSize.widthPercent / 100) * containerRect.width,
        origH: (signatureSize.heightPercent / 100) * containerRect.height
      });
      return;
    }

    setIsDraggingSig(true);
    const containerRect = docContainerRef.current.getBoundingClientRect();
    const sigCurrentX = (signaturePos.xPercent / 100) * containerRect.width;
    const sigCurrentY = (signaturePos.yPercent / 100) * containerRect.height;
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    setDragOffset({
      x: mouseX - sigCurrentX,
      y: mouseY - sigCurrentY
    });
  };

  // Global mousemove and mouseup listeners for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!docContainerRef.current) return;
      const containerRect = docContainerRef.current.getBoundingClientRect();

      if (isDraggingSig) {
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        const newX = mouseX - dragOffset.x;
        const newY = mouseY - dragOffset.y;

        const xPercent = Math.max(0, Math.min(100 - signatureSize.widthPercent, (newX / containerRect.width) * 100));
        const yPercent = Math.max(0, Math.min(100 - signatureSize.heightPercent, (newY / containerRect.height) * 100));

        setSignaturePos({ xPercent, yPercent });
      }

      if (isResizingSig) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const newWidthPx = Math.max(60, resizeStart.origW + deltaX);
        const newHeightPx = Math.max(25, resizeStart.origH + deltaY);

        const widthPercent = Math.min(60, (newWidthPx / containerRect.width) * 100);
        const heightPercent = Math.min(30, (newHeightPx / containerRect.height) * 100);

        setSignatureSize({ widthPercent, heightPercent });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSig(false);
      setIsResizingSig(false);
    };

    if (isDraggingSig || isResizingSig) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSig, isResizingSig, dragOffset, resizeStart, signatureSize]);

  // ====== SAVE FORM STATE ======
  const saveFormData = async () => {
    setIsSaving(true);
    setSaveStatus('Saving form...');
    try {
      const payload = {
        formId: form.id,
        formName: form.name,
        employeeId: employee?.id || 'guest',
        employeeName: employee?.fullName || 'Employee',
        fields: fields,
        signature: signatureImage ? {
          image: signatureImage,
          pos: signaturePos,
          size: signatureSize
        } : null,
        lastUpdated: new Date().toISOString()
      };

      // 1. Save to LocalStorage
      const storageKey = `compliance_form_${form.id}_${employee?.id || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));

      // 2. Save to Firestore
      if (employee?.id) {
        const docRef = doc(db, 'savedComplianceForms', `${employee.id}_${form.id}`);
        await setDoc(docRef, payload, { merge: true });
      }

      setSaveStatus('✅ Form saved successfully!');
      if (onSaveSuccess) onSaveSuccess(payload);
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      console.error('Error saving form data:', err);
      setSaveStatus('❌ Error saving form');
    } finally {
      setIsSaving(false);
    }
  };

  // ====== DOWNLOAD COMPLETED PDF VIA PDF-LIB ======
  const downloadCompletedPDF = async () => {
    setIsDownloading(true);
    setSaveStatus('Compiling high-fidelity PDF...');
    try {
      // 1. Fetch template PDF
      const pdfBytes = await fetch(form.file).then(res => {
        if (!res.ok) throw new Error(`Could not fetch PDF template: ${res.status}`);
        return res.arrayBuffer();
      });

      // 2. Load PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // 3. Draw all filled text fields
      fields.forEach(field => {
        if (!field.text || field.text.trim() === '') return;

        const fontSize = field.fontSize || 10;
        const font = field.isBold ? helveticaBold : helveticaFont;
        
        const pdfX = (field.xPercent / 100) * width;
        const pdfY = height - ((field.yPercent / 100) * height) - (fontSize * 0.9);

        // Handle multiline text
        if (field.multiline && field.text.includes('\n')) {
          const lines = field.text.split('\n');
          lines.forEach((line, idx) => {
            firstPage.drawText(line, {
              x: pdfX,
              y: pdfY - (idx * (fontSize + 3)),
              size: fontSize,
              font: font,
              color: rgb(0.1, 0.1, 0.1)
            });
          });
        } else {
          firstPage.drawText(field.text, {
            x: pdfX,
            y: pdfY,
            size: fontSize,
            font: font,
            color: rgb(0.1, 0.1, 0.1)
          });
        }
      });

      // 4. Draw Signature if present
      if (signatureImage) {
        try {
          const signatureImageBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
          let embeddedSig;
          if (signatureImage.startsWith('data:image/jpeg') || signatureImage.startsWith('data:image/jpg')) {
            embeddedSig = await pdfDoc.embedJpg(signatureImageBytes);
          } else {
            embeddedSig = await pdfDoc.embedPng(signatureImageBytes);
          }

          const sigPdfX = (signaturePos.xPercent / 100) * width;
          const sigPdfWidth = (signatureSize.widthPercent / 100) * width;
          const sigPdfHeight = (signatureSize.heightPercent / 100) * height;
          const sigPdfY = height - (((signaturePos.yPercent + signatureSize.heightPercent) / 100) * height);

          firstPage.drawImage(embeddedSig, {
            x: sigPdfX,
            y: sigPdfY,
            width: sigPdfWidth,
            height: sigPdfHeight
          });
        } catch (sigErr) {
          console.warn('Could not embed signature into PDF:', sigErr);
        }
      }

      // 5. Save & trigger browser download
      const compiledBytes = await pdfDoc.save();
      const blob = new Blob([compiledBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const cleanEmpName = (employee?.fullName || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanFormName = (form.name || 'Compliance_Form').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${cleanFormName}_${cleanEmpName}_signed.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSaveStatus('✅ Downloaded signed PDF successfully!');
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      console.error('PDF compilation failed:', err);
      alert(`Error generating PDF: ${err.message}`);
      setSaveStatus('❌ Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="compliance-editor-modal-overlay">
      <div className="compliance-editor-container">
        
        {/* Top Header Bar */}
        <div className="editor-top-bar">
          <div className="editor-title-group">
            <div className="form-icon-pill">
              <TextFieldsIcon />
            </div>
            <div>
              <h2>{form.name}</h2>
              <p className="editor-subtitle">
                Interactive Form • Click any blank to type • Drag signature to position
              </p>
            </div>
          </div>

          <div className="editor-top-actions">
            {saveStatus && (
              <span className="editor-status-toast">{saveStatus}</span>
            )}

            <button
              onClick={autoFillEmployeeDetails}
              className="btn-editor-secondary"
              title="Auto-fill with your profile information"
            >
              <AutoFixHighIcon style={{ fontSize: 18 }} />
              Auto-Fill Info
            </button>

            <button
              onClick={saveFormData}
              disabled={isSaving}
              className="btn-editor-secondary"
            >
              <SaveIcon style={{ fontSize: 18 }} />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              onClick={downloadCompletedPDF}
              disabled={isDownloading}
              className="btn-editor-primary"
            >
              <GetAppIcon style={{ fontSize: 18 }} />
              {isDownloading ? 'Compiling PDF...' : 'Download Signed PDF'}
            </button>

            <button onClick={onClose} className="btn-editor-close" title="Close editor">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Editor Controls & Tool Ribbon */}
        <div className="editor-toolbar-ribbon">
          <div className="ribbon-group">
            <span className="ribbon-label">Text Tools</span>
            <button
              className={`ribbon-tool-btn ${activeTool === 'addText' ? 'active' : ''}`}
              onClick={() => setActiveTool(activeTool === 'addText' ? 'select' : 'addText')}
              title="Click anywhere on the document blank to place a new text field"
            >
              <TouchAppIcon style={{ fontSize: 18 }} />
              {activeTool === 'addText' ? 'Click on Form to Place' : '+ Add Text at Blank'}
            </button>

            <div className="ribbon-font-controls">
              <FormatSizeIcon style={{ fontSize: 16, color: '#64748b' }} />
              <select
                value={activeFontSize}
                onChange={(e) => setActiveFontSize(Number(e.target.value))}
                className="ribbon-select"
              >
                <option value={8}>8 pt (Small)</option>
                <option value={9.5}>9.5 pt</option>
                <option value={11}>11 pt (Standard)</option>
                <option value={13}>13 pt (Large)</option>
                <option value={16}>16 pt (Title)</option>
              </select>
            </div>
          </div>

          <div className="ribbon-divider" />

          <div className="ribbon-group">
            <span className="ribbon-label">E-Signature</span>
            <button
              onClick={() => setShowDrawPadModal(true)}
              className="ribbon-tool-btn highlight"
            >
              <GestureIcon style={{ fontSize: 18 }} />
              Draw Signature
            </button>

            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="ribbon-tool-btn"
            >
              <UploadIcon style={{ fontSize: 18 }} />
              Upload Signature
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleSignatureUpload}
            />

            {signatureImage && (
              <button
                onClick={() => setSignatureImage(null)}
                className="ribbon-tool-btn danger"
                title="Remove signature"
              >
                <DeleteIcon style={{ fontSize: 18 }} />
                Remove
              </button>
            )}
          </div>

          <div className="ribbon-divider" />

          <div className="ribbon-group">
            <span className="ribbon-label">Zoom & View</span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
              className="ribbon-icon-btn"
              title="Zoom Out"
            >
              <ZoomOutIcon />
            </button>
            <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.1))}
              className="ribbon-icon-btn"
              title="Zoom In"
            >
              <ZoomInIcon />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="ribbon-icon-btn"
              title="Reset Zoom"
            >
              <RestartAltIcon />
            </button>
          </div>
        </div>

        {/* Main Document Workspace */}
        <div className="editor-workspace-scroll">
          <div
            className={`editor-document-stage ${activeTool === 'addText' ? 'crosshair-cursor' : ''}`}
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            {/* The Document Canvas Container */}
            <div
              ref={docContainerRef}
              className="document-canvas-card"
              onClick={handleContainerClick}
            >
              {/* Background Document View */}
              <iframe
                src={`${form.file}#toolbar=0&navpanes=0&scrollbar=0`}
                className="document-iframe-bg"
                title={form.name}
              />

              {/* Form Blank Fields Overlay */}
              {fields.map(field => {
                const isSelected = selectedFieldId === field.id;
                return (
                  <div
                    key={field.id}
                    className={`form-blank-field-wrapper ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${field.xPercent}%`,
                      top: `${field.yPercent}%`,
                      width: `${field.widthPercent}%`,
                      minHeight: `${field.heightPercent || 3}%`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                    }}
                  >
                    {field.multiline ? (
                      <textarea
                        value={field.text}
                        onChange={(e) => handleFieldTextChange(field.id, e.target.value)}
                        placeholder={`Click to edit ${field.label || 'blank'}...`}
                        style={{
                          fontSize: `${field.fontSize || activeFontSize}px`,
                          color: field.color || activeTextColor
                        }}
                        className="blank-input multiline"
                        rows={2}
                      />
                    ) : (
                      <input
                        type="text"
                        value={field.text}
                        onChange={(e) => handleFieldTextChange(field.id, e.target.value)}
                        placeholder={`Click to edit ${field.label || 'blank'}...`}
                        style={{
                          fontSize: `${field.fontSize || activeFontSize}px`,
                          color: field.color || activeTextColor
                        }}
                        className="blank-input"
                      />
                    )}

                    {/* Field Action Buttons */}
                    {isSelected && (
                      <div className="field-action-strip">
                        <span className="field-pill-label">{field.label || 'Field'}</span>
                        <button
                          onClick={(e) => handleDeleteField(field.id, e)}
                          className="field-delete-btn"
                          title="Delete field"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Draggable & Resizable E-Signature Overlay */}
              {signatureImage && (
                <div
                  className={`signature-interactive-box ${isDraggingSig ? 'dragging' : ''}`}
                  style={{
                    left: `${signaturePos.xPercent}%`,
                    top: `${signaturePos.yPercent}%`,
                    width: `${signatureSize.widthPercent}%`,
                    height: `${signatureSize.heightPercent}%`
                  }}
                  onMouseDown={handleSigMouseDown}
                >
                  <img
                    src={signatureImage}
                    alt="E-Signature"
                    className="signature-preview-img"
                    draggable={false}
                  />

                  <div className="sig-drag-badge">
                    <DragIndicatorIcon style={{ fontSize: 12 }} />
                    Drag to Position
                  </div>

                  {/* Corner Resize Handle */}
                  <div
                    className="sig-resize-handle"
                    title="Drag to resize signature"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="editor-bottom-bar">
          <div className="editor-instructions-pill">
            <span>💡 <b>Tip:</b> Click any blank area or "+ Add Text" to type text.</span>
            <span>✍️ Draw or upload your e-signature and drag it directly onto the signature line.</span>
            <span>💾 Click "Download Signed PDF" to generate the final signed document.</span>
          </div>

          <div className="editor-footer-buttons">
            <button onClick={onClose} className="btn-editor-secondary">
              Close
            </button>
            <button onClick={saveFormData} className="btn-editor-secondary">
              <SaveIcon style={{ fontSize: 16 }} />
              Save Progress
            </button>
            <button onClick={downloadCompletedPDF} className="btn-editor-primary">
              <GetAppIcon style={{ fontSize: 16 }} />
              Download Signed PDF
            </button>
          </div>
        </div>

      </div>

      {/* DRAW SIGNATURE PAD MODAL */}
      {showDrawPadModal && (
        <div className="signature-draw-modal-overlay" onClick={() => setShowDrawPadModal(false)}>
          <div className="signature-draw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="draw-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GestureIcon style={{ color: '#4f46e5' }} />
                <h3>Draw Your E-Signature</h3>
              </div>
              <button onClick={() => setShowDrawPadModal(false)} className="draw-modal-close">
                <CloseIcon />
              </button>
            </div>

            <div className="draw-pad-wrapper">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="signature-draw-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <p className="draw-pad-hint">Sign inside the box using your mouse, trackpad, or finger</p>
            </div>

            <div className="draw-pad-controls">
              <div className="color-picker-group">
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Ink:</span>
                <button
                  className={`color-dot ${penColor === '#0a2540' ? 'active' : ''}`}
                  style={{ background: '#0a2540' }}
                  onClick={() => setPenColor('#0a2540')}
                  title="Dark Navy"
                />
                <button
                  className={`color-dot ${penColor === '#000000' ? 'active' : ''}`}
                  style={{ background: '#000000' }}
                  onClick={() => setPenColor('#000000')}
                  title="Black"
                />
                <button
                  className={`color-dot ${penColor === '#1e40af' ? 'active' : ''}`}
                  style={{ background: '#1e40af' }}
                  onClick={() => setPenColor('#1e40af')}
                  title="Royal Blue"
                />
              </div>

              <div className="stroke-width-group">
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Thickness:</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </div>

              <button onClick={clearCanvas} className="btn-clear-canvas">
                Clear
              </button>
            </div>

            <div className="draw-modal-actions">
              <button
                onClick={() => setShowDrawPadModal(false)}
                className="btn-draw-cancel"
              >
                Cancel
              </button>
              <button
                onClick={saveDrawnSignature}
                className="btn-draw-apply"
              >
                <CheckCircleIcon style={{ fontSize: 18 }} />
                Apply Signature to Document
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ComplianceFormEditor;