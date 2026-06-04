import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getPosts, 
  getForms, 
  submitFormResponse, 
  getUserStatus, 
  uploadPaymentScreenshot,
  registerUser,
  updateUserProfile,
  uploadUserDocument,
  uploadSubmissionDocument,
  submitInfoRequestResponse,
  deleteUserDocument,
  loginUser,
  getJobs,
  uploadFileToDrive,
  getSettings
} from '../services/db';
import { 
  CheckCircle, 
  Download, 
  UploadCloud, 
  Filter, 
  Calendar, 
  Phone, 
  User, 
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Printer,
  FileText,
  FileCheck,
  Upload,
  AlertCircle,
  Eye,
  Check,
  X,
  ShieldAlert,
  Trash2,
  Clock
} from 'lucide-react';

const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON parse error:", e, str);
    return fallback;
  }
};

const getGoogleDriveId = (url) => {
  if (!url) return null;
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return null;
};

const checkIfPdf = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf') || lowerUrl.includes('/file/d/');
};

const getFileExtension = (url) => {
  if (!url) return '';
  if (checkIfPdf(url) || url.toLowerCase().includes('pdf') || url.toLowerCase().includes('application/pdf')) return 'PDF';
  
  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('.');
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return ext.toUpperCase();
    }
    if (ext === 'pdf') return 'PDF';
  }
  
  if (url.includes('drive.google.com')) {
    return 'IMAGE/PDF';
  }
  
  return 'FILE';
};

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('drive.google.com')) {
      if (checkIfPdf(url)) {
        return url;
      }
      const driveId = getGoogleDriveId(url);
      if (driveId) {
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      }
    }
    return url;
  }
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return `http://${window.location.hostname}:8000${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

const STANDARD_FIELDS = {
  name: { label: 'Applicant Name', type: 'text', required: true },
  name_tamil: { label: 'பெயர் ( தமிழில் )', type: 'text', required: false },
  dob: { label: 'Date of Birth (DOB)', type: 'date', required: true },
  phone: { label: 'Mobile Number', type: 'tel', required: true },
  aadhar: { label: 'Aadhaar Number', type: 'text', required: false },
  gender: { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: false },
  marital_status: { label: 'Marital Status', type: 'select', options: ['Unmarried', 'Married', 'Divorced', 'Widowed'], required: false },
  father_name: { label: 'Father', type: 'text', required: false },
  father_name_tamil: { label: 'தந்தை பெயர் ( தமிழில் )', type: 'text', required: false },
  mother_name: { label: "Mother Name", type: 'text', required: false },
  mother_name_tamil: { label: 'தாயின் பெயர் ( தமிழில் )', type: 'text', required: false },
  religion: { label: 'Religion', type: 'select', options: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'], required: false },
  community: { label: 'Community', type: 'select', options: ['OC', 'BC', 'MBC', 'SC', 'ST', 'DNC', 'BCM'], required: false },
  state: { label: 'State', type: 'select', options: ['Tamil Nadu', 'Puducherry', 'Kerala', 'Karnataka', 'Andhra Pradesh'], required: false },
  district: { label: 'District', type: 'select', options: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Thanjavur', 'Kancheepuram', 'Tiruvallur', 'Tiruvannamalai', 'Viluppuram', 'Cuddalore', 'Pudukkottai', 'Karur', 'Namakkal', 'Dharmapuri', 'Krishnagiri', 'The Nilgiris', 'Theni', 'Dindigul', 'Virudhunagar', 'Sivaganga', 'Ramanathapuram', 'Tiruppur', 'Tenkasi', 'Chengalpattu', 'Ranipet', 'Tirupathur', 'Kallakurichi', 'Mayiladuthurai'], required: false },
  taluk: { label: 'Taluk', type: 'text', required: false },
  revenue_village: { label: 'Revenue Village ( பாஞ்சாயத்து )', type: 'text', required: false },
  street_name: { label: 'Street Name', type: 'text', required: false },
  door_no: { label: 'Door no', type: 'text', required: false },
  pincode: { label: 'Pin Code', type: 'number', required: false },
  address: { label: 'Address', type: 'textarea', required: false },
  
  photo: { label: 'Photo Upload (image < 7MB)' },
  aadhar_doc: { label: 'Aadhaar Upload (img/pdf < 5MB)' },
  smart_card: { label: 'Smart Card Upload (img/pdf < 5MB)' },
  voter_id: { label: 'Voter ID Upload (img/pdf < 5MB)' },
  signature: { label: 'Signature Upload (img/pdf < 5MB)' }
};

export default function UserPortal({ currentUser, onUpdateProfile, onLoginTrigger }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab states: 'home' | 'apply' | 'status'
  const activeTab = searchParams.get('tab') || 'home';
  const initialCategory = searchParams.get('category') || '';
  
  const [posts, setPosts] = useState([]);
  const [forms, setForms] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [systemSettings, setSystemSettings] = useState({});
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [searchingStatus, setSearchingStatus] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [formsLoading, setFormsLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Auto-scroll to top when tab or selected job changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, selectedJobDetails]);
  const [error, setError] = useState('');
  
  // Wizard States
  const [selectedForm, setSelectedForm] = useState(null);
  const [wizardStep, setWizardStep] = useState(1); 
  // 1: Instructions, 2: Fill/Verify, 3: Preview, 4: Upload Docs, 5: Receipt
  
  const [formData, setFormData] = useState({}); // Dynamic and standard values
  const [agreeCheckbox, setAgreeCheckbox] = useState(false);
  
  // Document upload state
  // Stores file selections: { [docKey]: { type: 'pdf' | 'images', file1, file2 } }
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadStatuses, setUploadStatuses] = useState({});
  const [uploadedUrls, setUploadedUrls] = useState({});
  const [uploadProgress, setUploadProgress] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  
  // Status Lookup States
  const [lookupType, setLookupType] = useState('phone'); // 'phone' or 'aadhar'
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupAadhar, setLookupAadhar] = useState('');
  const [lookupDob, setLookupDob] = useState('');
  const [userApplications, setUserApplications] = useState([]);
  const [hasSearchedStatus, setHasSearchedStatus] = useState(false);
  const [uploadingScreenshotId, setUploadingScreenshotId] = useState(null);

  const [infoRequestTexts, setInfoRequestTexts] = useState({});
  const [infoRequestFiles, setInfoRequestFiles] = useState({});
  const [deletedSavedDocs, setDeletedSavedDocs] = useState({});
  const [duplicateSubmissionError, setDuplicateSubmissionError] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Refresh key: incrementing this forces the status useEffect to re-fetch data
  // even when activeTab and currentUser references haven't changed.
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);

  // Tracks when userApplications was last populated after a submission.
  // Prevents the status useEffect from overwriting fresh data with stale Google Sheets data.
  const lastStatusFetchRef = useRef(0);

  // Premium custom Toast Alerts system (Intercepts and upgrades native alert dialogs)
  const [toast, setToast] = useState(null);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);

  const alert = (message, type = 'success') => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }
    
    let alertType = type;
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('fail') || lowerMessage.includes('error') || lowerMessage.includes('exceed') || lowerMessage.includes('not permitted') || lowerMessage.includes('exceeds')) {
      alertType = 'error';
    } else if (lowerMessage.includes('please') || lowerMessage.includes('check') || lowerMessage.includes('enter') || lowerMessage.includes('already applied') || lowerMessage.includes('required')) {
      alertType = 'warning';
    }
    
    setToast({ message, type: alertType });
    
    const id = setTimeout(() => {
      setToast(null);
      setToastTimeoutId(null);
    }, 4500);
    setToastTimeoutId(id);
  };

  const handleInfoRequestSubmit = async (appId, type) => {
    setLoading(true);
    try {
      if (type === 'file') {
        const file = infoRequestFiles[appId];
        if (!file) {
          alert('Please select a file to upload.');
          return;
        }
        await submitInfoRequestResponse(appId, file, true);
      } else {
        const text = infoRequestTexts[appId] || '';
        if (!text.trim()) {
          alert('Please enter a response.');
          return;
        }
        await submitInfoRequestResponse(appId, text, false);
      }
      alert('Information submitted successfully! Thank you.');
      
      // Refresh list
      const phoneVal = currentUser?.phone || lookupPhone;
      const dobVal = lookupDob || '';
      const aadharVal = currentUser?.aadhar || lookupAadhar;
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedDoc = async (docKey) => {
    if (!currentUser) return;
    const docLabel = STANDARD_FIELDS[docKey]?.label || docKey;
    if (!window.confirm(`Are you sure you want to delete and replace your stored ${docLabel}? This will physically delete the file from the server.`)) {
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await deleteUserDocument(currentUser.id, docKey);
      onUpdateProfile(updatedUser);
      setDeletedSavedDocs(prev => ({ ...prev, [docKey]: true }));
      alert(`Stored ${docLabel} has been successfully deleted from the server. Please select and upload your new file.`);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete stored document.');
    } finally {
      setLoading(false);
    }
  };

  async function fetchPosts() {
    setPostsLoading(true);
    try {
      const postsData = await getPosts();
      setPosts(postsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Google Workspace Apps Script Web App to load latest updates.');
    } finally {
      setPostsLoading(false);
    }
  }

  async function fetchForms() {
    setFormsLoading(true);
    try {
      const formsData = await getForms();
      setForms(formsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Google Workspace Apps Script Web App to load application forms.');
    } finally {
      setFormsLoading(false);
    }
  }

  async function fetchJobs() {
    setJobsLoading(true);
    try {
      const jobsData = await getJobs();
      setJobs(jobsData);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Google Workspace Apps Script Web App to load job alerts.');
    } finally {
      setJobsLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
    fetchForms();
    fetchJobs();
    getSettings().then(data => {
      if (data) setSystemSettings(data);
    }).catch(err => console.error('Failed to load settings', err));
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Load User profile data into form when entering step 2
  useEffect(() => {
    if (selectedForm && wizardStep === 2) {
      const initialFields = {};
      let fieldsConfig = safeJsonParse(selectedForm.required_fields, []);
      
      const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);
      
      if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
        const canFields = [
          'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
          'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
          'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
          'street_name', 'door_no', 'pincode', 'address'
        ];
        fieldsConfig = Array.from(new Set([...canFields, ...fieldsConfig]));
      }
      
      // If user is logged in, prefill standard fields from profile
      if (currentUser) {
        fieldsConfig.forEach(fieldId => {
          if (fieldId === 'marital_status') {
            initialFields['marital_status'] = currentUser.marital_status || '';
          } else {
            initialFields[fieldId] = currentUser[fieldId] || '';
          }
        });
      }

      // Prefill custom fields from user profile custom_fields
      if (currentUser && currentUser.custom_fields) {
        try {
          const parsedCustom = typeof currentUser.custom_fields === 'string' 
            ? JSON.parse(currentUser.custom_fields) 
            : currentUser.custom_fields;
          
          if (parsedCustom && typeof parsedCustom === 'object') {
            const customFields = safeJsonParse(selectedForm.fields, []);
            customFields.forEach(f => {
              if (f.type === 'repeated') {
                // Prefill count
                if (parsedCustom[f.id] !== undefined) {
                  initialFields[f.id] = parsedCustom[f.id];
                } else if (parsedCustom[f.label] !== undefined) {
                  initialFields[f.id] = parsedCustom[f.label];
                }
                // Prefill members
                const count = parseInt(initialFields[f.id] || parsedCustom[f.id] || parsedCustom[f.label]) || 0;
                for (let i = 1; i <= count; i++) {
                  (f.subFields || []).forEach(sub => {
                    const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                    if (parsedCustom[subFieldKey] !== undefined) {
                      initialFields[subFieldKey] = parsedCustom[subFieldKey];
                    }
                  });
                }
              } else {
                if (parsedCustom[f.label] !== undefined) {
                  initialFields[f.id] = parsedCustom[f.label];
                }
              }
            });
          }
        } catch (e) {
          console.error("Error parsing profile custom fields for autofill:", e);
        }
      }
      
      setFormData(prev => ({ ...initialFields, ...prev }));
    }
  }, [selectedForm, wizardStep, currentUser]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
    // Reset wizard states
    if (tabName !== 'apply') {
      setSelectedForm(null);
      setWizardStep(1);
      setFormData({});
      setUploadedFiles({});
      setSubmissionResult(null);
      setAgreeCheckbox(false);
      setDeletedSavedDocs({});
      setDuplicateSubmissionError('');
    }
  };

  const selectFormToFill = async (form) => {
    if (currentUser && currentUser.aadhar) {
      setLoading(true);
      try {
        const userSubs = await getUserStatus(currentUser.phone, '', currentUser.aadhar);
        if (Array.isArray(userSubs) && userSubs.some(s => s.form_id === form.id && s.payment_status !== 'draft')) {
          alert(`You have already applied for the ${form.title}. You cannot apply more than once.`);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking pre-existing application:", err);
      } finally {
        setLoading(false);
      }
    }
    setSelectedForm(form);
    setWizardStep(1);
    setFormData({});
    setUploadedFiles({});
    setAgreeCheckbox(false);
    setDeletedSavedDocs({});
    setDuplicateSubmissionError('');
  };

  const handleFieldChange = (fieldId, val) => {
    setFormData(prev => ({ ...prev, [fieldId]: val }));
    
    // Early duplicate check when Aadhaar is entered (12 digits)
    if (fieldId === 'aadhar' && val && val.match(/^\d{12}$/) && selectedForm) {
      checkDuplicateSubmission(val);
    } else if (fieldId === 'aadhar' && (!val || !val.match(/^\d{12}$/))) {
      setDuplicateSubmissionError('');
    }
  };

  const checkDuplicateSubmission = async (aadharValue) => {
    setCheckingDuplicate(true);
    try {
      const targetPhone = formData.phone || currentUser?.phone || '';
      const targetDob = '';
      const userSubs = await getUserStatus(targetPhone, targetDob, aadharValue);
      if (Array.isArray(userSubs) && userSubs.some(s => s.form_id === selectedForm.id && s.payment_status !== 'draft')) {
        setDuplicateSubmissionError(`You have already applied for "${selectedForm.title}". You cannot apply more than once. You are already applicable for this certificate.`);
      } else {
        setDuplicateSubmissionError('');
      }
    } catch (err) {
      console.error('Error checking duplicate submission:', err);
      setDuplicateSubmissionError('');
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // --- WIZARD STEPS PROGRESSION ---

  // Proceed from Step 1 (Instructions) to Step 2 (Form details)
  const handleProceedToForm = () => {
    setWizardStep(2);
  };

  // Proceed from Step 2 (Form details) to Step 3 (Preview)
  const handleValidateForm = async (e) => {
    e.preventDefault();
    
    // Block if duplicate submission detected
    if (duplicateSubmissionError) {
      alert(duplicateSubmissionError);
      return;
    }
    
    // Check validation of standard required fields
    let reqFields = safeJsonParse(selectedForm.required_fields, []);
    const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);
    
    if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
      const canFields = [
        'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
        'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
        'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
        'street_name', 'door_no', 'pincode', 'address'
      ];
      reqFields = Array.from(new Set([...canFields, ...reqFields]));
    }
    const missing = [];
    
    reqFields.forEach(fieldId => {
      const isFieldRequired = STANDARD_FIELDS[fieldId]?.required || (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai');
      if (isFieldRequired && !formData[fieldId]) {
        missing.push(STANDARD_FIELDS[fieldId]?.label || fieldId);
      }
    });

    // Dynamic fields verification
    const customFields = safeJsonParse(selectedForm.fields, []);
    customFields.forEach(f => {
      if (f.required && !formData[f.id]) {
        missing.push(f.label);
      }
    });

    if (missing.length > 0) {
      alert(`Please fill in all required fields: ${missing.join(', ')}`);
      return;
    }

    // Phone / Aadhaar validation checks
    if (formData.phone && !formData.phone.match(/^\d{10}$/)) {
      alert('Please enter a valid 10-digit Phone Number');
      return;
    }
    if (formData.aadhar && !formData.aadhar.match(/^\d{12}$/)) {
      alert('Please enter a valid 12-digit Aadhaar Number');
      return;
    }

    setLoading(true);
    try {
      if (!currentUser) {
        // User not registered: automatically register them on the fly
        const regPayload = {
          name: formData.name || 'User Profile',
          name_tamil: formData.name_tamil || undefined,
          dob: formData.dob || '',
          phone: formData.phone || '',
          aadhar: formData.aadhar || undefined,
          gender: formData.gender || undefined,
          marital_status: formData.marital_status || undefined,
          father_name: formData.father_name || undefined,
          father_name_tamil: formData.father_name_tamil || undefined,
          mother_name: formData.mother_name || undefined,
          mother_name_tamil: formData.mother_name_tamil || undefined,
          community: formData.community || undefined,
          address: formData.address || undefined,
          religion: formData.religion || undefined,
          state: formData.state || undefined,
          district: formData.district || undefined,
          taluk: formData.taluk || undefined,
          revenue_village: formData.revenue_village || undefined,
          street_name: formData.street_name || undefined,
          door_no: formData.door_no || undefined,
          pincode: formData.pincode || undefined
        };

        const registeredUser = await registerUser(regPayload);
        onUpdateProfile(registeredUser);
        alert('Welcome! We have registered your details in TN sevai so you can pre-fill forms easily in the future.');
      } else {
        // User is logged in: update profile with any inline corrections
        const updatePayload = {
          name: formData.name,
          name_tamil: formData.name_tamil || undefined,
          dob: formData.dob || '',
          phone: formData.phone || '',
          aadhar: formData.aadhar || undefined,
          gender: formData.gender || undefined,
          marital_status: formData.marital_status || undefined,
          father_name: formData.father_name || undefined,
          father_name_tamil: formData.father_name_tamil || undefined,
          mother_name: formData.mother_name || undefined,
          mother_name_tamil: formData.mother_name_tamil || undefined,
          community: formData.community || undefined,
          address: formData.address || undefined,
          religion: formData.religion || undefined,
          state: formData.state || undefined,
          district: formData.district || undefined,
          taluk: formData.taluk || undefined,
          revenue_village: formData.revenue_village || undefined,
          street_name: formData.street_name || undefined,
          door_no: formData.door_no || undefined,
          pincode: formData.pincode || undefined
        };
        const updated = await updateUserProfile(currentUser.id, updatePayload);
        onUpdateProfile(updated);
      }
      setWizardStep(3); // Proceed to Step 3 (Preview)
    } catch (err) {
      console.error(err);
      alert(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Proceed from Step 3 (Preview) to Step 4 (Upload Docs)
  const handleProceedToUploads = () => {
    if (!agreeCheckbox) {
      alert('Please check the terms and conditions checkbox to proceed.');
      return;
    }
    setWizardStep(4);
  };

  // Animated upload text
  useEffect(() => {
    let interval;
    const hasUploading = Object.values(uploadStatuses).some(s => s === 'uploading');
    if (hasUploading) {
      interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === 'Uploading.') return 'Uploading..';
          if (prev === 'Uploading..') return 'Uploading...';
          return 'Uploading.';
        });
      }, 500);
    } else {
      setUploadProgress('');
    }
    return () => clearInterval(interval);
  }, [uploadStatuses]);

  // Handle immediate upload for independent documents
  const handleImmediateUpload = async (docKey, uploadType, fileInputIdx, file) => {
    if (!file) return;

    // Check size limit
    const limit = docKey === 'photo' ? 7 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > limit) {
      alert(`File size exceeds limit. ${docKey === 'photo' ? 'Photo' : 'Documents'} must be less than ${limit / (1024 * 1024)}MB.`);
      return;
    }

    setUploadStatuses(prev => ({ ...prev, [docKey]: 'uploading' }));
    if (!uploadProgress) setUploadProgress('Uploading.');

    try {
      let folderPath = ['TN_Sevai_App', 'Submissions', 'Temp'];
      if (currentUser) {
        folderPath = ['TN_Sevai_App', 'Users', currentUser.phone || 'Unknown', 'Documents'];
      }
      
      const fileUrl = await uploadFileToDrive(file, folderPath);
      
      setUploadedUrls(prev => {
        const current = prev[docKey] || { type: uploadType };
        if (uploadType === 'pdf') {
          return { ...prev, [docKey]: { type: 'pdf', url1: fileUrl, name1: file.name } };
        } else {
          return { ...prev, [docKey]: { ...current, type: 'images', [`url${fileInputIdx}`]: fileUrl, [`name${fileInputIdx}`]: file.name } };
        }
      });
      
      setUploadStatuses(prev => ({ ...prev, [docKey]: 'uploaded' }));
    } catch (err) {
      console.error(err);
      alert("Failed to upload " + docKey);
      setUploadStatuses(prev => ({ ...prev, [docKey]: 'failed' }));
    }
  };

  // Proceed from Step 4 (Upload Docs) to Step 5 (Receipt) - Perform uploads and save submission
  const handleFinalWizardSubmit = async () => {
    const requiredDocsList = safeJsonParse(selectedForm.required_docs, []);
    const customDocsList = safeJsonParse(selectedForm.custom_docs, []);
    const missing = [];

    // Verify all required documents are selected OR exist in profile
    requiredDocsList.forEach(docKey => {
      const isAlreadyUploaded = currentUser && !deletedSavedDocs[docKey] && (
        (docKey === 'photo' && currentUser.photo_url) ||
        (docKey === 'signature' && currentUser.signature_url_1) ||
        currentUser[`${docKey}_url_1`] ||
        currentUser[`${docKey}_url`]
      );
      const isSelectedLocal = uploadedUrls[docKey] && (uploadedUrls[docKey].url1 || uploadedUrls[docKey].url2);
      
      if (!isAlreadyUploaded && !isSelectedLocal) {
        missing.push(STANDARD_FIELDS[docKey]?.label || docKey);
      }
    });

    customDocsList.forEach(docLabel => {
      const isSelectedLocal = uploadedUrls[docLabel] && uploadedUrls[docLabel].url1;
      if (!isSelectedLocal) {
        missing.push(docLabel);
      }
    });

    if (missing.length > 0) {
      alert(`Please upload files for: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    setUploadProgress('Checking application status...');

    try {
      // Check if already applied (Form ID + User Aadhar check)
      const targetAadhar = formData.aadhar || currentUser?.aadhar || '';
      const targetPhone = formData.phone || currentUser?.phone || '';
      const targetDob = '';
      
      if (targetAadhar) {
        const userSubs = await getUserStatus(targetPhone, targetDob, targetAadhar);
        if (Array.isArray(userSubs) && userSubs.some(s => s.form_id === selectedForm.id && s.payment_status !== 'draft')) {
          alert(`You have already applied for this service (${selectedForm.title})! Multiple applications are not permitted.`);
          setLoading(false);
          return;
        }
      }

      setUploadProgress('Storing application data...');
      // 1. Package response answers (split standard fields and custom fields)
      const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
      const customFields = safeJsonParse(selectedForm.fields, []);
      const responsesPack = {};
      
      reqFieldsKeys.forEach(fieldId => {
        responsesPack[STANDARD_FIELDS[fieldId]?.label || fieldId] = formData[fieldId] || '';
      });
      
      customFields.forEach(f => {
        if (f.type === 'repeated') {
          const count = parseInt(formData[f.id]) || 0;
          responsesPack[f.label || 'Count'] = count;
          for (let i = 1; i <= count; i++) {
            (f.subFields || []).forEach(sub => {
              const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
              const subLabel = `${f.label ? f.label.replace('count', '').replace('Count', '').replace(':', '').trim() : 'Item'} #${i} - ${sub.label}`;
              responsesPack[subLabel] = formData[subFieldKey] || '';
            });
          }
        } else {
          responsesPack[f.label] = formData[f.id] || '';
        }
      });
      
      // 2. Prepare documents payload using uploadedUrls and currentUser saved docs
      const docReferencesPack = {};
      requiredDocsList.forEach(docKey => {
        if (deletedSavedDocs[docKey]) return; // Skip if deleted/replaced!
        
        const hasSavedUrl1 = currentUser && currentUser[`${docKey}_url_1` || ''];
        const hasSavedUrl2 = currentUser && currentUser[`${docKey}_url_2` || ''];
        const isPhotoSavedUrl = docKey === 'photo' && currentUser && currentUser.photo_url;
        const isSignatureSavedUrl = docKey === 'signature' && currentUser && currentUser.signature_url_1;
        
        const freshlyUploaded = uploadedUrls[docKey];
        
        if (freshlyUploaded) {
           docReferencesPack[docKey] = freshlyUploaded.type === 'pdf' 
             ? [freshlyUploaded.url1] 
             : [freshlyUploaded.url1, freshlyUploaded.url2].filter(Boolean);
        } else if (isPhotoSavedUrl) {
           docReferencesPack['photo'] = [currentUser.photo_url];
        } else if (isSignatureSavedUrl) {
           docReferencesPack['signature'] = [currentUser.signature_url_1];
        } else if (hasSavedUrl1) {
           docReferencesPack[docKey] = [hasSavedUrl1];
           if (hasSavedUrl2) docReferencesPack[docKey].push(hasSavedUrl2);
        }
      });

      customDocsList.forEach(docLabel => {
        const freshlyUploaded = uploadedUrls[docLabel];
        if (freshlyUploaded) {
           docReferencesPack[docLabel] = freshlyUploaded.type === 'pdf' 
             ? [freshlyUploaded.url1] 
             : [freshlyUploaded.url1, freshlyUploaded.url2].filter(Boolean);
        }
      });

      // 3. Create Submission record in Backend, including uploadedDocs
      const submission = await submitFormResponse(
        selectedForm.id,
        formData.phone || currentUser?.phone || '',
        formData.dob || currentUser?.dob || '',
        formData.aadhar || currentUser?.aadhar || '',
        responsesPack,
        "submitted",
        docReferencesPack
      );

      setSubmissionResult(submission);

      // Save filled custom fields to user profile for future auto-filling
      if (currentUser) {
        let currentCustom = {};
        if (currentUser.custom_fields) {
          try {
            currentCustom = typeof currentUser.custom_fields === 'string' 
              ? JSON.parse(currentUser.custom_fields) 
              : currentUser.custom_fields;
          } catch(e) {
            console.error("Error parsing user custom fields:", e);
          }
        }
        
        // Merge custom field responses from this submission
        const customFields = safeJsonParse(selectedForm.fields, []);
        customFields.forEach(f => {
          if (f.type === 'repeated') {
            currentCustom[f.id] = formData[f.id]; // Save the count
            currentCustom[f.label] = formData[f.id]; // Also save with label as fallback
            const count = parseInt(formData[f.id]) || 0;
            for (let i = 1; i <= count; i++) {
              (f.subFields || []).forEach(sub => {
                const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                if (formData[subFieldKey] !== undefined) {
                  currentCustom[subFieldKey] = formData[subFieldKey];
                }
              });
            }
          } else {
            if (formData[f.id] !== undefined) {
              currentCustom[f.label] = formData[f.id];
            }
          }
        });
        
        // Save back to user profile
        try {
          await updateUserProfile(currentUser.id, {
            custom_fields: JSON.stringify(currentCustom)
          });
        } catch (err) {
          console.error("Failed to sync custom fields to profile:", err);
        }
      }

      // Fetch latest profile state to sync document and custom URLs
      const phoneVal = currentUser?.phone || formData.phone || '';
      const dobVal = '';
      const aadharVal = currentUser?.aadhar || formData.aadhar || '';

      console.log('[Upload Success] Form submission completed successfully.', {
        submissionId: submission.id,
        formId: selectedForm.id,
        phone: phoneVal,
        dob: dobVal,
        aadhar: aadharVal
      });

      // Wait briefly for Google Sheets to propagate the new row before re-fetching
      console.log('[Fetch] Waiting 2s for Google Sheets propagation before refreshing status...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (phoneVal) {
        try {
          console.log('[Fetch] Re-fetching user applications after submission...');
          const freshApps = await getUserStatus(phoneVal, dobVal, aadharVal);
          console.log('[Fetch] Refreshed applications data:', freshApps?.length, 'records found');
          
          // Optimistic merge: ensure the new submission appears even if Google Sheets
          // hasn't propagated yet. Check if the submission is already in the list.
          let mergedApps = freshApps || [];
          const submissionExists = mergedApps.some(app => app.id === submission.id);
          if (!submissionExists && submission) {
            console.log('[State] New submission not found in fetched data — adding optimistically');
            mergedApps = [submission, ...mergedApps];
          }
          
          setUserApplications(mergedApps);
          setHasSearchedStatus(true);
          lastStatusFetchRef.current = Date.now();
          console.log('[State] userApplications set with', mergedApps.length, 'records (timestamp:', lastStatusFetchRef.current, ')');
        } catch (e) {
          console.error("Error refreshing applications list on submit:", e);
          // Even on error, optimistically add the submission
          setUserApplications(prev => {
            const exists = prev.some(app => app.id === submission.id);
            if (!exists) return [submission, ...prev];
            return prev;
          });
          setHasSearchedStatus(true);
          lastStatusFetchRef.current = Date.now();
        }
      } else {
        // No credentials to fetch — just optimistically add the submission
        setUserApplications(prev => {
          const exists = prev.some(app => app.id === submission.id);
          if (!exists) return [submission, ...prev];
          return prev;
        });
        setHasSearchedStatus(true);
        lastStatusFetchRef.current = Date.now();
      }

      if (currentUser) {
        // Simply reload the profile locally
        const latestProfile = await loginUser({ dob: currentUser.dob, phone: currentUser.phone }).catch(() => null);
        if (latestProfile && latestProfile.id) {
          onUpdateProfile(latestProfile);
        }
      }

      // Increment refresh key to force the status useEffect to re-fetch
      // when the user navigates to the Status tab
      setStatusRefreshKey(prev => {
        const newKey = prev + 1;
        console.log('[State] statusRefreshKey incremented to:', newKey);
        return newKey;
      });

      setUploadProgress('');
      setWizardStep(5); // Final Step: Get Receipt
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to complete document uploads.');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  // --- LOOKUP & SCREENSHOT PROOF ---
  const handleStatusLookup = async (e) => {
    e.preventDefault();
    const phoneVal = lookupType === 'phone' ? lookupPhone.trim() : '';
    const aadharVal = lookupType === 'aadhar' ? lookupAadhar.trim() : '';
    const dobVal = lookupDob.trim();

    if (lookupType === 'phone' && !phoneVal) {
      alert('Please enter your Phone number.');
      return;
    }
    if (lookupType === 'aadhar' && !aadharVal) {
      alert('Please enter your Aadhaar number.');
      return;
    }

    setSearchingStatus(true);
    try {
      console.log('[Fetch] Manual status lookup initiated:', { phone: phoneVal, dob: dobVal, aadhar: aadharVal });
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      console.log('[Fetch] Manual status lookup received', data?.length, 'applications');
      setUserApplications(data);
      setHasSearchedStatus(true);
      console.log('[State] userApplications updated with', data?.length, 'records from manual lookup');
    } catch (err) {
      console.error('[Fetch] Manual status lookup error:', err);
      alert(err.message || 'No submissions found with these credentials.');
    } finally {
      setSearchingStatus(false);
    }
  };

  // Load submissions automatically if logged-in user clicks Status tab
  // statusRefreshKey is included to force a re-fetch after form submission
  // even if activeTab and currentUser haven't changed references.
  useEffect(() => {
    if (activeTab === 'status' && currentUser) {
      // Skip re-fetch if data was freshly populated after a submission (within 10 seconds).
      // This prevents the useEffect from overwriting optimistically-merged data with
      // stale Google Sheets data that hasn't propagated the new row yet.
      const timeSinceLastFetch = Date.now() - lastStatusFetchRef.current;
      if (timeSinceLastFetch < 10000) {
        console.log('[Fetch] Status useEffect SKIPPED — data is fresh (age:', timeSinceLastFetch, 'ms). Using existing userApplications.');
        return;
      }

      const loadUserSubmissions = async () => {
        try {
          console.log('[Fetch] Status useEffect triggered. Fetching user submissions...', {
            activeTab,
            statusRefreshKey,
            phone: currentUser.phone,
            dob: currentUser.dob
          });
          const data = await getUserStatus(currentUser.phone, '', currentUser.aadhar);
          console.log('[Fetch] Status useEffect received', data?.length, 'applications');
          setUserApplications(data);
          setHasSearchedStatus(true);
          lastStatusFetchRef.current = Date.now();
          console.log('[State] userApplications updated with', data?.length, 'records');
        } catch (e) {
          console.error('[Fetch] Status useEffect error:', e);
        }
      };
      loadUserSubmissions();
    }
  }, [activeTab, currentUser, statusRefreshKey]);

  const handleScreenshotUpload = async (subId, file) => {
    if (!file) return;
    setUploadingScreenshotId(subId);
    try {
      await uploadPaymentScreenshot(subId, file);
      alert('Payment proof uploaded successfully! Admin will verify your payment details.');
      
      // Refresh list
      const phoneVal = currentUser?.phone || lookupPhone;
      const dobVal = lookupDob || '';
      const aadharVal = currentUser?.aadhar || lookupAadhar;
      const data = await getUserStatus(phoneVal, dobVal, aadharVal);
      setUserApplications(data);
    } catch (err) {
      console.error(err);
      alert('Failed to upload screenshot.');
    } finally {
      setUploadingScreenshotId(null);
    }
  };

  const handleUpiPay = (fee, submissionId) => {
    const pa = "9385497906@upi";
    const pn = encodeURIComponent("TN sevai");
    const am = fee;
    const cu = "INR";
    const tn = encodeURIComponent(`TN_sevai_Pay_${submissionId}`);
    const tr = `TN_sevai_Pay_${submissionId}`;
    
    // Direct Google Pay deep link using tez:// (native protocol for Google Pay Tez in India)
    const payUrl = `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}&tr=${tr}`;
    
    // Attempt to open Google Pay directly
    window.location.href = payUrl;
    
    // Smart Fallback: If Google Pay is not installed, the browser remains in focus.
    // After 1.5 seconds, we fall back to the generic upi:// scheme to trigger the system's
    // UPI app chooser, completely avoiding any Google Play Store redirects!
    setTimeout(() => {
      if (document.hasFocus()) {
        window.location.href = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}&tr=${tr}`;
      }
    }, 1500);
  };

  const printReceipt = () => {
    const applicantName = formData.name || currentUser?.name || 'N/A';
    const phoneNo = submissionResult.phone || 'N/A';
    const certName = selectedForm.title || 'N/A';
    const fee = selectedForm.fee || 0;
    const status = (submissionResult.payment_status || 'unpaid').toUpperCase();
    const receiptId = submissionResult.id || 'N/A';
    const submittedDate = submissionResult.submitted_at 
      ? new Date(submissionResult.submitted_at) 
      : new Date();
    const dateStr = submittedDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = submittedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const aadharNo = submissionResult.aadhar ? submissionResult.aadhar.replace(/(\d{4})/g, '$1 ').trim() : 'N/A';

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TN Sevai Receipt - ${receiptId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #1e293b; padding: 30px; }
          .receipt { max-width: 480px; margin: 0 auto; border: 2px dashed #10b981; border-radius: 16px; padding: 28px; position: relative; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3rem; color: #10b981; opacity: 0.04; font-weight: 900; pointer-events: none; }
          .header { text-align: center; border-bottom: 1.5px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 18px; }
          .header h2 { font-size: 1.3rem; color: #047857; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
          .header .sub { font-size: 0.75rem; color: #10b981; font-weight: 700; }
          .header .sub2 { font-size: 0.65rem; color: #64748b; font-weight: 600; margin-top: 2px; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; font-weight: 500; }
          .value { font-weight: 700; color: #1e293b; text-align: right; max-width: 55%; word-break: break-all; }
          .value.green { color: #10b981; }
          .value.red { color: #ef4444; }
          .divider { border-top: 1.5px dashed #cbd5e1; margin: 14px 0; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; }
          .badge-unpaid { background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; }
          .badge-paid { background: #f0fdf4; color: #10b981; border: 1px solid #86efac; }
          .footer { text-align: center; margin-top: 16px; font-size: 0.7rem; color: #94a3b8; }
          @media print { body { padding: 10px; } .receipt { border-color: #333; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">TN SEVAI</div>
          <div class="header">
            <h2>${certName}</h2>
            <div class="sub">TN SEVAI </div>
            <div class="sub2"> Receipt</div>
          </div>
          <div class="row"><span class="label">Receipt ID:</span><span class="value green">${receiptId}</span></div>
          <div class="row"><span class="label">Applicant Name:</span><span class="value">${applicantName}</span></div>
          <div class="row"><span class="label">Certificate / Service:</span><span class="value">${certName}</span></div>
          <div class="row"><span class="label">Phone Number:</span><span class="value">${phoneNo}</span></div>
          <div class="row"><span class="label">Aadhaar Number:</span><span class="value">${aadharNo}</span></div>
          <div class="row"><span class="label">Date:</span><span class="value">${dateStr}</span></div>
          <div class="row"><span class="label">Time:</span><span class="value">${timeStr}</span></div>
          <div class="divider"></div>
          <div class="row"><span class="label">Service Fee:</span><span class="value" style="font-size:1rem;font-weight:800;">Rs. ${fee}</span></div>
          <div class="row"><span class="label">Payment Status:</span><span class="badge ${status === 'PAID' ? 'badge-paid' : 'badge-unpaid'}">${status}</span></div>
          <div class="footer">Thank you for using TN Sevai E-Service Portal.<br/>Save this receipt for your records.</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    } else {
      alert('Please allow pop-ups to download the receipt.');
    }
  };

  const resumeApplicationDraft = (app) => {
    const targetForm = forms.find(f => f.id === app.form_id);
    if (!targetForm) {
      alert("Form template for this draft is no longer available.");
      return;
    }
    
    const draftResponses = typeof app.responses === 'string' ? safeJsonParse(app.responses, {}) : (app.responses || {});
    const newFormData = {};
    
    // 1. Map standard fields
    const reqFieldsKeys = safeJsonParse(targetForm.required_fields, []);
    reqFieldsKeys.forEach(fieldId => {
      const label = STANDARD_FIELDS[fieldId]?.label || fieldId;
      if (draftResponses[label] !== undefined) {
        newFormData[fieldId] = draftResponses[label];
      }
    });
    
    // 2. Map custom fields
    const customFields = safeJsonParse(targetForm.fields, []);
    customFields.forEach(f => {
      if (f.type === 'repeated') {
        const countLabel = f.label || 'Count';
        if (draftResponses[countLabel] !== undefined) {
          newFormData[f.id] = draftResponses[countLabel];
          const count = parseInt(draftResponses[countLabel]) || 0;
          for (let i = 1; i <= count; i++) {
            (f.subFields || []).forEach(sub => {
              const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
              const subLabel = `${f.label ? f.label.replace('count', '').replace('Count', '').replace(':', '').trim() : 'Item'} #${i} - ${sub.label}`;
              if (draftResponses[subLabel] !== undefined) {
                newFormData[subFieldKey] = draftResponses[subLabel];
              }
            });
          }
        }
      } else {
        if (draftResponses[f.label] !== undefined) {
          newFormData[f.id] = draftResponses[f.label];
        }
      }
    });
    
    // Load into wizard
    setSelectedForm(targetForm);
    setFormData(newFormData);
    setWizardStep(2); // Go directly to Step 2 (Fill/Verify)
    setSearchParams({ tab: 'apply' }); // Change to apply tab
  };

  const renderMintGreenLoader = (label = "LOADING...") => {
    return (
      <div 
        style={{ 
          padding: '24px', 
          gridColumn: 'span 2', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="shimmer-text" style={{
            margin: 0,
            fontSize: '1.2rem',
            fontWeight: '900',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif'
          }}>
            {label}
          </div>
          <div className="shimmer-text" style={{
            margin: '4px 0 0 0',
            fontSize: '0.9rem',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>
            pls wait.
          </div>
        </div>
      </div>
    );
  };

  // --- CATEGORIES HELPER ---
  const filteredForms = selectedCategory === 'all'
    ? forms
    : forms.filter(f => f.category.toLowerCase() === selectedCategory.toLowerCase());

  const serverConfig = (() => {
    try {
      const saved = localStorage.getItem('whatsbro_server_config');
      return saved ? JSON.parse(saved) : { active: true, message: 'Server issues, so pls wait...' };
    } catch(e) {
      return { active: true, message: 'Server issues, so pls wait...' };
    }
  })();

  if (!serverConfig.active) {
    return (
      <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="premium-card text-center" style={{ borderTop: '6px solid #ef4444', maxWidth: '400px', width: '100%', padding: '32px 24px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px auto', animation: 'pulse-text 2s ease-in-out infinite' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>server issues ,so pls wait...</h3>
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginTop: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, fontWeight: '600', lineHeight: '1.5' }}>
              {serverConfig.message || 'The system is undergoing routine upgrades. Please check back later.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Premium custom Toast Alerts */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '16px',
          background: toast.type === 'error' ? '#fef2f2' : toast.type === 'warning' ? '#fffbeb' : '#f0fdf4',
          border: `1.5px solid ${toast.type === 'error' ? '#fca5a5' : toast.type === 'warning' ? '#fde68a' : '#a7f3d0'}`,
          color: toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#92400e' : '#065f46',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          maxWidth: '380px',
          width: '90%',
          animation: 'float-card 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          ) : toast.type === 'warning' ? (
            <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
          ) : (
            <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: '700', lineHeight: '1.4', flex: 1, textAlign: 'left' }}>
            {toast.message}
          </span>
          <button 
            onClick={() => setToast(null)} 
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit', opacity: 0.6 }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        {error && (
          <div className="premium-card" style={{ borderLeft: '4px solid var(--error)', background: '#fee2e2', color: '#991b1b', margin: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* --- TAB 1: HOME POSTS --- */}
        {activeTab === 'home' && (
          <div className="desktop-grid-2" style={{ padding: '0 8px' }}>
            {currentUser && (
              <div style={{ gridColumn: 'span 2', padding: '16px 8px 8px 8px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                  Hi! {currentUser.name}
                </h2>
              </div>
            )}
            {postsLoading ? (
              renderMintGreenLoader("LOADING...")
            ) : posts.length === 0 ? (
              <div className="premium-card text-center" style={{ padding: '40px 20px', gridColumn: 'span 2' }}>
                <p className="text-muted">No services published yet.</p>
              </div>
            ) : (
              posts.map((post) => {
                return (
                  <div key={post.id} className="instagram-post-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-light-main)', margin: 0, lineHeight: '1.3' }}>
                      {post.title}
                    </h3>

                    {post.img_url && post.img_url.trim() !== '' && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', maxHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={getImageUrl(post.img_url)} 
                          style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} 
                          alt={post.title} 
                        />
                      </div>
                    )}

                    <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                      {post.description}
                    </p>

                    {post.apply_url && post.apply_url.trim() !== '' && post.apply_url.trim().toLowerCase() !== 'none' && (
                      <button 
                        onClick={() => {
                          if (post.apply_url.startsWith('/user')) {
                            const urlParams = new URLSearchParams(post.apply_url.split('?')[1]);
                            setSearchParams(urlParams);
                          } else {
                            window.open(post.apply_url, '_blank');
                          }
                        }}
                        className="premium-btn premium-btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', marginTop: '4px', width: '100%', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Apply Now <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 1B: JOB ALERTS --- */}
        {activeTab === 'jobs' && (
          <div className="desktop-grid-2" style={{ padding: '0 8px' }}>
            {selectedJobDetails ? (
              <div style={{ gridColumn: 'span 2' }}>
                <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '6px solid var(--primary)', background: 'white', borderRadius: '16px' }}>
                  
                  {/* Nested Details Back Button */}
                  <button 
                    onClick={() => setSelectedJobDetails(null)} 
                    className="premium-btn premium-btn-secondary" 
                    style={{ width: 'fit-content', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
                  >
                    <ArrowLeft size={16} /> Back to Jobs
                  </button>

                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-light-main)', margin: '0', lineHeight: '1.3' }}>
                    {selectedJobDetails.title}
                  </h2>

                  {selectedJobDetails.img_url && selectedJobDetails.img_url.trim() !== '' && (
                    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', maxHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                      <img 
                        src={getImageUrl(selectedJobDetails.img_url)} 
                        style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} 
                        alt={selectedJobDetails.title} 
                      />
                    </div>
                  )}

                  <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.6', margin: 0, paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {selectedJobDetails.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {parseDetailsDoc(selectedJobDetails.details_doc)}
                  </div>

                  {selectedJobDetails.apply_url && selectedJobDetails.apply_url.trim() !== '' && selectedJobDetails.apply_url.trim().toLowerCase() !== 'none' && (
                    <div style={{ marginTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
                      <button 
                        onClick={() => {
                          const url = selectedJobDetails.apply_url;
                          setSelectedJobDetails(null);
                          if (url.startsWith('/user')) {
                            const urlParams = new URLSearchParams(url.split('?')[1]);
                            setSearchParams(urlParams);
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                        className="premium-btn premium-btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '1.1rem' }}
                      >
                        {selectedJobDetails.button_name || 'Apply Now'} <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : jobsLoading ? (
              renderMintGreenLoader("LOADING...")
            ) : jobs.length === 0 ? (
              <div className="premium-card text-center" style={{ padding: '40px 20px', gridColumn: 'span 2' }}>
                <p className="text-muted">No job alerts published yet.</p>
              </div>
            ) : (
              jobs.map((job) => {
                return (
                  <div key={job.id} className="instagram-post-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-light-main)', margin: 0, lineHeight: '1.3' }}>
                      {job.title}
                    </h3>

                    {job.img_url && job.img_url.trim() !== '' && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', maxHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={getImageUrl(job.img_url)} 
                          style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} 
                          alt={job.title} 
                        />
                      </div>
                    )}

                    <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                      {job.description}
                    </p>

                    {((job.apply_url && job.apply_url.trim() !== '' && job.apply_url.trim().toLowerCase() !== 'none') || (job.details_doc && job.details_doc.trim() !== '')) && (
                      <button 
                        onClick={() => setSelectedJobDetails(job)}
                        className="premium-btn premium-btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', marginTop: '4px', width: '100%', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        View Details & Apply <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 2: CERTIFICATE APPLICATIONS WIZARD --- */}
        {activeTab === 'apply' && (
          <div>
            {!selectedForm ? (
              // Form selections
              <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 10px 0' }}>
                  <Filter size={16} className="text-muted" />
                  <span className="premium-label" style={{ margin: 0 }}>Service Category Filter</span>
                </div>
                
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="premium-input"
                  style={{ marginBottom: '16px', background: 'white' }}
                >
                  <option value="all">All Categories</option>
                  <option value="E sevai">E Sevai</option>
                  <option value="pan card">PAN Card</option>
                  <option value="voter id">Voter ID</option>
                  <option value="others">Others</option>
                </select>
 
                {formsLoading ? (
                  renderMintGreenLoader("LOADING...")
                ) : filteredForms.length === 0 ? (
                  <div className="premium-card text-center" style={{ padding: '40px 20px' }}>
                    <p className="text-muted">No form templates found in this category.</p>
                  </div>
                ) : (
                  <div className="desktop-grid-2">
                    {filteredForms.map((form) => {
                      const fieldsCount = safeJsonParse(form.required_fields, []).length;
                      const docsCount = safeJsonParse(form.required_docs, []).length;
                      const isUpcoming = fieldsCount === 0 && docsCount === 0;

                      return (
                        <div key={form.id} className="premium-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span className="badge badge-info">{form.category}</span>
                            {isUpcoming ? (
                              <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>Upcoming</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Apply</span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{form.title}</h3>
                          
                          {form.img_url && (
                            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                              <img src={getImageUrl(form.img_url)} alt={form.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px' }}>
                              Rs ₹{form.fee || 0}
                            </span>
                          </div>
                          
                          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '16px' }}>{form.description}</p>
                          <button 
                            onClick={() => !isUpcoming && selectFormToFill(form)}
                            className={`premium-btn ${isUpcoming ? 'premium-btn-secondary' : 'premium-btn-primary'}`}
                            style={{ padding: '10px', opacity: isUpcoming ? 0.7 : 1, cursor: isUpcoming ? 'not-allowed' : 'pointer' }}
                            disabled={isUpcoming}
                          >
                            {isUpcoming ? 'Upcoming soon' : 'Click to Apply'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Active 5-Step Application Wizard
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <button onClick={() => setSelectedForm(null)} className="premium-btn premium-btn-secondary" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>{selectedForm.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Apply Wizard - Step {wizardStep} of 5</p>
                  </div>
                </div>

                {/* Highly refined HSL-themed 5 Step progress path */}
                <div className="step-wizard" style={{ marginTop: '16px' }}>
                  <div className="step-wizard-line" style={{ height: '3px', background: '#cbd5e1' }}></div>
                  <div className="step-wizard-progress" style={{ 
                    height: '3px',
                    background: 'var(--primary)',
                    width: `${((wizardStep - 1) / 4) * 100}%` 
                  }}></div>
                  {[1, 2, 3, 4, 5].map(step => (
                    <div 
                      key={step} 
                      className={`step-node ${wizardStep >= step ? 'completed' : ''}`}
                      style={{
                        width: '30px',
                        height: '30px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: wizardStep >= step ? 'var(--primary)' : '#e2e8f0',
                        color: wizardStep >= step ? '#ffffff' : '#64748b',
                        border: wizardStep === step ? '2px solid #ffffff' : 'none',
                        boxShadow: wizardStep === step ? '0 0 0 2px var(--primary)' : 'none'
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '-10px 16px 20px 16px', fontSize: '0.65rem', color: 'var(--text-light-muted)', fontWeight: 700 }}>
                  <span>Instructions</span>
                  <span>Fill Form</span>
                  <span>Preview</span>
                  <span>Upload Docs</span>
                  <span>Receipt</span>
                </div>

                {/* STEP 1: INSTRUCTIONS & TERMS */}
                {wizardStep === 1 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '8px', color: '#1e293b' }}>Application Guide & Terms</h4>
                      {selectedForm.description && (
                        <p style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '12px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                          <strong>Service Description:</strong> {selectedForm.description}
                        </p>
                      )}
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                        Please read the following instructions carefully before starting the application.
                      </p>

                      <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h5 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Instructions List:</h5>
                        {selectedForm.instructions ? (
                          <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                            {selectedForm.instructions.split('\n').filter(Boolean).map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>No instructions configured by admin. Please fill the details in the next steps.</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>E-Gov Processing & Service Fee:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>Rs. {selectedForm.fee || 0}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleProceedToForm}
                      className="premium-btn premium-btn-primary"
                      style={{ marginBottom: '20px' }}
                    >
                      I Agree, Proceed <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {/* STEP 2: FILL OR VERIFY DATA */}
                {wizardStep === 2 && (
                  <form onSubmit={handleValidateForm} style={{ padding: '0 16px' }}>
                    {/* Non Logged-in Alert */}
                    {!currentUser && (
                      selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' ? (
                        <div className="premium-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', color: '#991b1b', margin: '0 0 16px 0', padding: '12px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                            <ShieldAlert size={16} /> E-Sevai CAN Registration Required
                          </h4>
                          <p style={{ fontSize: '0.75rem', margin: 0 }}>
                            Guest User: E-Sevai services require a Citizen Access Number (CAN) profile. <strong>We will automatically register your account and store your CAN Details</strong> on submission!
                            <br />
                            <span onClick={onLoginTrigger} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Click here to Login</span> if you already have a profile.
                          </p>
                        </div>
                      ) : (
                        <div className="premium-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', color: '#991b1b', margin: '0 0 16px 0', padding: '12px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                            <ShieldAlert size={16} /> Guest Application Notice
                          </h4>
                          <p style={{ fontSize: '0.75rem', margin: 0 }}>
                            You are currently filling this form as a Guest. <strong>We will automatically register your account on submission</strong> using your DOB and Phone, saving these values so they pre-fill next time!
                            <br />
                            <span onClick={onLoginTrigger} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Click here to Login</span> if you already have a profile.
                          </p>
                        </div>
                      )
                    )}

                    {currentUser && (
                      selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' ? (
                        !(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name) ? (
                          /* Case 1: First-time user / Incomplete CAN Details */
                          <div className="premium-card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', color: '#78350f', margin: '0 0 16px 0', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                              <AlertCircle size={16} /> First-time E-Sevai Citizen Registration (Case 1)
                            </h4>
                            <p style={{ fontSize: '0.75rem', margin: 0 }}>
                              Welcome, <strong>{currentUser.name}</strong>! We could not find any pre-existing CAN Details for your account. Please fill in the complete CAN citizen registration form below; <strong>these values will be securely stored as your default profile data</strong> for all future applications!
                            </p>
                          </div>
                        ) : (
                          /* Case 2: Existing User with stored CAN Details */
                          <div className="premium-card" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', color: '#065f46', margin: '0 0 16px 0', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
                              <CheckCircle size={16} style={{ color: '#10b981' }} /> Stored CAN Profile Loaded (Case 2)
                            </h4>
                            <p style={{ fontSize: '0.75rem', margin: 0 }}>
                              Hello, <strong>{currentUser.name}</strong>! Your stored E-Sevai CAN Profile pre-data has been successfully loaded. If any details have changed, <strong>you can directly correct them below</strong> and we will synchronize them back to your stored profile instantly.
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="premium-card" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', color: '#065f46', margin: '0 0 16px 0', padding: '10px 14px' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '500', margin: 0 }}>
                            Logged In: <strong>{currentUser.name}</strong>. Stored profile values have been prefilled. <strong>Any corrections you make below will automatically update your stored profile!</strong>
                          </p>
                        </div>
                      )
                    )}

                {duplicateSubmissionError && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
                    border: '2px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    <ShieldAlert size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#991b1b' }}>Duplicate Application Detected</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#b91c1c', lineHeight: '1.5' }}>{duplicateSubmissionError}</p>
                    </div>
                  </div>
                )}

                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '16px', color: '#1e293b' }}>Application Data Form</h4>
                      
                      {/* Render checklist fields chosen by Admin */}
                      {(() => {
                        let fieldsConfig = safeJsonParse(selectedForm.required_fields, []);
                        const isCase2 = currentUser && !!(currentUser.district || currentUser.religion || currentUser.state || currentUser.father_name);
                        
                        if (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai' && !isCase2) {
                          const canFields = [
                            'aadhar', 'phone', 'name', 'name_tamil', 'gender', 'marital_status', 'dob',
                            'father_name', 'mother_name', 'father_name_tamil', 'mother_name_tamil',
                            'religion', 'community', 'state', 'district', 'taluk', 'revenue_village',
                            'street_name', 'door_no', 'pincode', 'address'
                          ];
                          fieldsConfig = Array.from(new Set([...canFields, ...fieldsConfig]));
                        }
                        
                        return fieldsConfig.map(fieldId => {
                          const fieldConfig = STANDARD_FIELDS[fieldId];
                          if (!fieldConfig) return null;
                          const isRequired = fieldConfig.required || (selectedForm.category && selectedForm.category.toLowerCase() === 'e sevai');

                          return (
                            <div key={fieldId} className="premium-input-group">
                              <label className="premium-label">
                                {fieldConfig.label} {isRequired && <span style={{ color: 'var(--error)' }}>*</span>}
                              </label>
                              
                              {fieldConfig.type === 'select' ? (
                                <select
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  className="premium-input"
                                  required={isRequired}
                                >
                                  <option value="">-- Select option --</option>
                                  {fieldConfig.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : fieldConfig.type === 'textarea' ? (
                                <textarea
                                  value={formData[fieldId] || ''}
                                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                  placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
                                  rows={3}
                                  className="premium-input"
                                  required={isRequired}
                                />
                              ) : (
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type={fieldConfig.type}
                                    value={formData[fieldId] || ''}
                                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                    className="premium-input"
                                    placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
                                    required={isRequired}
                                    readOnly={fieldId === 'aadhar' && currentUser && !!currentUser.aadhar}
                                    style={fieldId === 'aadhar' && currentUser && currentUser.aadhar ? {
                                      backgroundColor: '#f1f5f9',
                                      color: '#64748b',
                                      cursor: 'not-allowed',
                                      borderColor: '#e2e8f0'
                                    } : {}}
                                  />
                                  {fieldId === 'aadhar' && currentUser && currentUser.aadhar && (
                                    <span style={{
                                      position: 'absolute',
                                      right: '10px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      fontSize: '0.65rem',
                                      color: '#94a3b8',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      🔒 Permanent
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}

                      {/* Render custom input fields added by Admin */}
                      {safeJsonParse(selectedForm.fields, []).map(f => {
                        if (f.type === 'repeated') {
                          const countValue = parseInt(formData[f.id]) || 0;
                          
                          return (
                            <div key={f.id} style={{ padding: '16px', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', marginBottom: '16px' }}>
                              <div className="premium-input-group" style={{ marginBottom: '12px' }}>
                                <label className="premium-label" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                  {f.label || 'Family Members Count'} (0-8) {f.required && <span style={{ color: 'var(--error)' }}>*</span>}
                                </label>
                                <select
                                  value={formData[f.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleFieldChange(f.id, val);
                                  }}
                                  className="premium-input"
                                  required={f.required}
                                >
                                  <option value="">-- Select Count (0-8) --</option>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>

                              {countValue > 0 && Array.from({ length: countValue }, (_, index) => {
                                const i = index + 1;
                                return (
                                  <div key={i} style={{ marginTop: '14px', padding: '12px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                                      #{i} {f.label ? f.label.replace('count', '').replace('Count', '').replace(':', '').trim() : 'Item'} Details
                                    </div>
                                    
                                    {(f.subFields || []).map(sub => {
                                      const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                                      return (
                                        <div key={sub.id} className="premium-input-group" style={{ marginBottom: '10px' }}>
                                          <label className="premium-label" style={{ fontSize: '0.75rem' }}>
                                            {sub.label} <span style={{ color: 'var(--error)' }}>*</span>
                                          </label>
                                          {sub.type === 'select' ? (
                                            <select
                                              value={formData[subFieldKey] || ''}
                                              onChange={(e) => handleFieldChange(subFieldKey, e.target.value)}
                                              className="premium-input"
                                              style={{ padding: '8px', fontSize: '0.85rem' }}
                                              required={true}
                                            >
                                              <option value="">-- Choose option --</option>
                                              {sub.options && sub.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <input
                                              type={sub.type}
                                              value={formData[subFieldKey] || ''}
                                              onChange={(e) => handleFieldChange(subFieldKey, e.target.value)}
                                              className="premium-input"
                                              style={{ padding: '8px', fontSize: '0.85rem' }}
                                              placeholder={`Enter ${sub.label.toLowerCase()}`}
                                              required={true}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div key={f.id} className="premium-input-group">
                            <label className="premium-label">{f.label} {f.required && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                            {f.type === 'textarea' ? (
                              <textarea
                                value={formData[f.id] || ''}
                                onChange={(e) => handleFieldChange(f.id, e.target.value)}
                                rows={3}
                                className="premium-input"
                                placeholder="Enter details..."
                                required={f.required}
                              />
                            ) : f.type === 'select' ? (
                              <select
                                value={formData[f.id] || ''}
                                onChange={(e) => handleFieldChange(f.id, e.target.value)}
                                className="premium-input"
                                required={f.required}
                              >
                                <option value="">-- Choose option --</option>
                                {f.options && f.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : f.type === 'checkbox' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {f.options && f.options.map(opt => {
                                  const currentVals = Array.isArray(formData[f.id]) ? formData[f.id] : (formData[f.id] ? formData[f.id].split(', ') : []);
                                  const isChecked = currentVals.includes(opt);
                                  return (
                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const nextVals = e.target.checked
                                            ? [...currentVals, opt]
                                            : currentVals.filter(v => v !== opt);
                                          handleFieldChange(f.id, nextVals.join(', '));
                                        }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : f.type === 'radio' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {f.options && f.options.map(opt => (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                                    <input
                                      type="radio"
                                      name={`custom-radio-${f.id}`}
                                      checked={formData[f.id] === opt}
                                      onChange={() => handleFieldChange(f.id, opt)}
                                      required={f.required}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <input
                                type={f.type}
                                value={formData[f.id] || ''}
                                onChange={(e) => handleFieldChange(f.id, e.target.value)}
                                className="premium-input"
                                placeholder="Type answer..."
                                required={f.required}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      type="submit" 
                      className="premium-btn premium-btn-primary"
                      style={{ marginBottom: '20px' }}
                    >
                      Verify Details <ChevronRight size={18} />
                    </button>
                  </form>
                )}

                {/* STEP 3: PREVIEW */}
                {wizardStep === 3 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderLeft: '4px solid var(--primary)', margin: '0 0 16px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>Summary Preview</h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Review all form values before locking application.</p>
                    </div>

                    <div className="premium-card" style={{ margin: '0 0 16px 0' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '10px' }}>Application Information</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
                          const customFields = safeJsonParse(selectedForm.fields, []);
                          const previewItems = [];
                          
                          reqFieldsKeys.forEach(fieldId => {
                            previewItems.push({
                              key: fieldId,
                              label: STANDARD_FIELDS[fieldId]?.label || fieldId,
                              value: formData[fieldId] || '—'
                            });
                          });
                          
                          customFields.forEach(f => {
                            if (f.type === 'repeated') {
                              const count = parseInt(formData[f.id]) || 0;
                              previewItems.push({
                                key: f.id,
                                label: f.label || 'Count',
                                value: count
                              });
                              for (let i = 1; i <= count; i++) {
                                (f.subFields || []).forEach(sub => {
                                  const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                                  const subLabel = `${f.label ? f.label.replace('count', '').replace('Count', '').replace(':', '').trim() : 'Item'} #${i} - ${sub.label}`;
                                  previewItems.push({
                                    key: subFieldKey,
                                    label: subLabel,
                                    value: formData[subFieldKey] || '—'
                                  });
                                });
                              }
                            } else {
                              previewItems.push({
                                key: f.id,
                                label: f.label,
                                value: formData[f.id] || '—'
                              });
                            }
                          });
                          
                          return previewItems.map(item => (
                            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span className="text-muted">{item.label}:</span>
                              <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{item.value}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="premium-card" style={{ margin: '0 0 20px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', color: '#1e293b' }}>
                        <input 
                          type="checkbox"
                          checked={agreeCheckbox}
                          onChange={(e) => setAgreeCheckbox(e.target.checked)}
                        />
                        <span>I hereby declare that all entries made in this form are correct and true to the best of my knowledge.</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button onClick={() => setWizardStep(2)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>Previous</button>
                      <button 
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const reqFieldsKeys = safeJsonParse(selectedForm.required_fields, []);
                            const customFields = safeJsonParse(selectedForm.fields, []);
                            const responsesPack = {};
                            
                            reqFieldsKeys.forEach(fieldId => {
                              responsesPack[STANDARD_FIELDS[fieldId]?.label || fieldId] = formData[fieldId] || '';
                            });
                            
                            customFields.forEach(f => {
                              if (f.type === 'repeated') {
                                const count = parseInt(formData[f.id]) || 0;
                                responsesPack[f.label || 'Count'] = count;
                                for (let i = 1; i <= count; i++) {
                                  (f.subFields || []).forEach(sub => {
                                    const subFieldKey = `${f.id}_member_${i}_${sub.id}`;
                                    const subLabel = `${f.label ? f.label.replace('count', '').replace('Count', '').replace(':', '').trim() : 'Item'} #${i} - ${sub.label}`;
                                    responsesPack[subLabel] = formData[subFieldKey] || '';
                                  });
                                }
                              } else {
                                responsesPack[f.label] = formData[f.id] || '';
                              }
                            });
                            await submitFormResponse(
                              selectedForm.id,
                              formData.phone || currentUser?.phone || '',
                              formData.dob || currentUser?.dob || '',
                              formData.aadhar || currentUser?.aadhar || '',
                              responsesPack,
                              "draft"
                            );
                            
                            console.log('[Upload Success] Draft saved successfully.');

                            // Wait briefly for Google Sheets propagation
                            await new Promise(resolve => setTimeout(resolve, 1500));

                            // Synchronize status list immediately in-memory
                            const phoneVal = formData.phone || currentUser?.phone || '';
                            const dobVal = '';
                            const aadharVal = formData.aadhar || currentUser?.aadhar || '';
                            if (phoneVal) {
                              try {
                                console.log('[Fetch] Re-fetching user applications after draft save...');
                                const freshApps = await getUserStatus(phoneVal, dobVal, aadharVal);
                                console.log('[Fetch] Refreshed applications data after draft:', freshApps?.length, 'records');
                                setUserApplications(freshApps);
                                setHasSearchedStatus(true);
                                lastStatusFetchRef.current = Date.now();
                              } catch (e) {
                                console.error("Error refreshing applications list on draft save:", e);
                              }
                            }

                            // Increment refresh key to force status useEffect re-fetch
                            setStatusRefreshKey(prev => prev + 1);
                            
                            alert('Draft saved successfully! You can search/resume your draft using your phone/aadhar in the status tab.');
                          } catch (err) {
                            console.error(err);
                            alert('Failed to save draft. ' + err.message);
                          } finally {
                            setLoading(false);
                          }
                        }} 
                        className="premium-btn premium-btn-success" 
                        style={{ flex: 1.5 }}
                      >
                        Save Draft
                      </button>
                      <button onClick={handleProceedToUploads} className="premium-btn premium-btn-primary" style={{ flex: 2 }}>Proceed to Docs <ChevronRight size={18} /></button>
                    </div>
                  </div>
                )}

                {/* STEP 4: UPLOAD DOCS WITH FILE SIZE / DUAL SELECTOR */}
                {wizardStep === 4 && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '0 0 20px 0' }}>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>Upload Required Documents</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>Attach certificate uploads. Photo must be &lt; 7MB, other files &lt; 5MB.</p>

                      {/* Loading status bar */}
                      {uploadProgress && (
                        <div style={{ padding: '12px', background: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '4px', marginBottom: '16px', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                          {uploadProgress}
                        </div>
                      )}

                      {/* Dynamic docs list (chosen by Admin) */}
                      {safeJsonParse(selectedForm.required_docs, []).map(docKey => {
                        const localFile = uploadedFiles[docKey] || {};
                        
                        // Get saved profile URL
                        const getSavedDocUrl = () => {
                          if (!currentUser) return null;
                          if (docKey === 'photo') return currentUser.photo_url;
                          if (docKey === 'signature') return currentUser.signature_url_1;
                          return currentUser[`${docKey}_url_1`] || currentUser[`${docKey}_url` || ''];
                        };
                        
                        const savedUrl = getSavedDocUrl();
                        const hasSavedDoc = !!savedUrl && !deletedSavedDocs[docKey];
                        
                        // Handle dual image vs PDF toggle state
                        const selectedType = localFile.type || 'pdf';

                        if (hasSavedDoc) {
                          // Render beautiful premium small preview card with Replace/Delete button
                          return (
                            <div key={docKey} className="document-upload-zone" style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #10b981', background: '#f0fdf4', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Small Display Thumbnail */}
                                {checkIfPdf(savedUrl) ? (
                                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                    <FileText size={22} />
                                  </div>
                                ) : (
                                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img 
                                      src={getImageUrl(savedUrl)} 
                                      alt="Preview" 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize', display: 'block' }}>
                                    {STANDARD_FIELDS[docKey]?.label || docKey} <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>[Saved]</span>
                                  </span>
                                  <a 
                                    href={getImageUrl(savedUrl)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ fontSize: '0.75rem', color: '#047857', textDecoration: 'underline', fontWeight: '700' }}
                                  >
                                    View File
                                  </a>
                                </div>
                              </div>
                              {/* Delete/Replace button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSavedDoc(docKey)}
                                className="premium-btn premium-btn-danger"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                              >
                                <Trash2 size={14} /> Delete & Replace
                              </button>
                            </div>
                          );
                        }

                        const isUploading = uploadStatuses[docKey] === 'uploading';
                        const isUploaded = uploadStatuses[docKey] === 'uploaded';
                        const freshlyUploaded = uploadedUrls[docKey];

                        return (
                          <div key={docKey} className="document-upload-zone" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' }}>
                                {STANDARD_FIELDS[docKey]?.label || docKey} <span style={{ color: 'var(--error)' }}>*</span>
                              </span>
                              {isUploaded && (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={14} /> Uploaded
                                </span>
                              )}
                            </div>

                            {isUploading ? (
                              <div style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #0369a1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                {uploadProgress || 'Uploading...'}
                              </div>
                            ) : isUploaded && freshlyUploaded ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '6px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
                                  {freshlyUploaded.type === 'pdf' ? freshlyUploaded.name1 : `${freshlyUploaded.name1} & ${freshlyUploaded.name2}`}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <a 
                                    href={getImageUrl(freshlyUploaded.url1)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="premium-btn premium-btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                                  >
                                    View
                                  </a>
                                  <label className="premium-btn premium-btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
                                    Replace
                                    <input 
                                      type="file" 
                                      accept={['photo', 'signature'].includes(docKey) ? 'image/*' : 'application/pdf,image/*'}
                                      onChange={(e) => handleImmediateUpload(docKey, 'pdf', 1, e.target.files[0])}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Options Toggle for Aadhaar, Voter, Smart Card (images vs PDF) */}
                                {docKey !== 'photo' && docKey !== 'signature' && (
                                  <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '6px', padding: '2px', border: '1px solid #cbd5e1', marginBottom: '10px', maxWidth: '240px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setUploadedFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], type: 'pdf' } }))}
                                      style={{
                                        flex: 1, padding: '4px 8px', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600',
                                        backgroundColor: selectedType === 'pdf' ? '#10b981' : 'transparent',
                                        color: selectedType === 'pdf' ? '#ffffff' : '#64748b', cursor: 'pointer'
                                      }}
                                    >
                                      One PDF File
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setUploadedFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], type: 'images' } }))}
                                      style={{
                                        flex: 1, padding: '4px 8px', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600',
                                        backgroundColor: selectedType === 'images' ? '#10b981' : 'transparent',
                                        color: selectedType === 'images' ? '#ffffff' : '#64748b', cursor: 'pointer'
                                      }}
                                    >
                                      2 Images
                                    </button>
                                  </div>
                                )}

                                {/* Render Upload inputs */}
                                {docKey === 'photo' || docKey === 'signature' || selectedType === 'pdf' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                      <Upload size={16} style={{ color: 'var(--primary)' }} />
                                      <span>Choose PDF / Image File to Upload</span>
                                      <input 
                                        type="file" 
                                        accept={['photo', 'signature'].includes(docKey) ? 'image/*' : 'application/pdf,image/*'}
                                        onChange={(e) => handleImmediateUpload(docKey, 'pdf', 1, e.target.files[0])}
                                        style={{ display: 'none' }}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Front Side:</span>
                                      <label className="premium-btn premium-btn-secondary" style={{ padding: '8px', fontSize: '0.75rem', display: 'flex', gap: '4px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                        <Upload size={14} style={{ color: 'var(--primary)' }} />
                                        <span>Upload Front</span>
                                        <input 
                                          type="file" 
                                          accept="image/*"
                                          onChange={(e) => handleImmediateUpload(docKey, 'images', 1, e.target.files[0])}
                                          style={{ display: 'none' }}
                                        />
                                      </label>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Back Side:</span>
                                      <label className="premium-btn premium-btn-secondary" style={{ padding: '8px', fontSize: '0.75rem', display: 'flex', gap: '4px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                        <Upload size={14} style={{ color: 'var(--primary)' }} />
                                        <span>Upload Back</span>
                                        <input 
                                          type="file" 
                                          accept="image/*"
                                          onChange={(e) => handleImmediateUpload(docKey, 'images', 2, e.target.files[0])}
                                          style={{ display: 'none' }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Custom Documents list */}
                      {safeJsonParse(selectedForm.custom_docs, []).map(docLabel => {
                        const isUploading = uploadStatuses[docLabel] === 'uploading';
                        const isUploaded = uploadStatuses[docLabel] === 'uploaded';
                        const freshlyUploaded = uploadedUrls[docLabel];

                        return (
                          <div key={docLabel} className="document-upload-zone" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>
                                {docLabel} <span style={{ color: 'var(--error)' }}>*</span>
                              </span>
                              {isUploaded && (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={14} /> Uploaded
                                </span>
                              )}
                            </div>

                            {isUploading ? (
                              <div style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #0369a1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                {uploadProgress || 'Uploading...'}
                              </div>
                            ) : isUploaded && freshlyUploaded ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '6px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
                                  {freshlyUploaded.name1}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <a 
                                    href={getImageUrl(freshlyUploaded.url1)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="premium-btn premium-btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                                  >
                                    View
                                  </a>
                                  <label className="premium-btn premium-btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
                                    Replace
                                    <input 
                                      type="file" 
                                      accept="application/pdf,image/*"
                                      onChange={(e) => handleImmediateUpload(docLabel, 'pdf', 1, e.target.files[0])}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1px dashed var(--primary)' }}>
                                <Upload size={16} style={{ color: 'var(--primary)' }} />
                                <span>Choose File to Upload</span>
                                <input 
                                  type="file" 
                                  accept="application/pdf,image/*"
                                  onChange={(e) => handleImmediateUpload(docLabel, 'pdf', 1, e.target.files[0])}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button onClick={() => setWizardStep(3)} className="premium-btn premium-btn-secondary" style={{ flex: 1 }}>Previous</button>
                      <button 
                        onClick={handleFinalWizardSubmit} 
                        disabled={loading}
                        className="premium-btn premium-btn-primary" 
                        style={{ flex: 2 }}
                      >
                        {loading ? 'Submitting Application...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: RECEIPT */}
                {wizardStep === 5 && submissionResult && (
                  <div style={{ padding: '0 16px' }}>
                    <div className="premium-card text-center" style={{ margin: '0 0 16px 0', borderBottom: '4px solid var(--success)' }}>
                      <CheckCircle size={44} style={{ color: 'var(--success)', margin: '0 auto 10px auto' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: '#1e293b' }}>Application Submitted!</h3>
                      <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Your application has been stored securely in TN sevai database.</p>
                    </div>

                    <div className="receipt-wrapper" id="receipt-downloadable-card" style={{ display: 'none' }}>
                      <div className="receipt-watermark" style={{ opacity: 0.05, fontSize: '2.5rem', color: '#10b981' }}>TN SEVAI</div>
                      <div className="receipt-header" style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '1.25rem', color: '#047857', margin: '0 0 6px 0', fontWeight: '900', textTransform: 'uppercase' }}>{selectedForm.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', display: 'block', marginBottom: '4px' }}>TN SEVAI E-SERVICE</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Official E-Governance Receipt</span>
                      </div>
                      
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Receipt ID:</span>
                        <span className="receipt-item-val" style={{ color: '#10b981', fontWeight: '700' }}>{submissionResult.id}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Service Applied:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{selectedForm.title}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Aadhaar Number:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{submissionResult.aadhar.replace(/(\d{4})/g, '$1 ').trim()}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Phone Number:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{submissionResult.phone}</span>
                      </div>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span className="receipt-item-label" style={{ color: '#64748b' }}>Submission Date:</span>
                        <span className="receipt-item-val" style={{ fontWeight: '700' }}>{new Date(submissionResult.submitted_at).toLocaleDateString()}</span>
                      </div>
 
                      <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0', paddingTop: '10px' }}>
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', alignItems: 'center' }}>
                           <span className="receipt-item-label" style={{ color: '#64748b' }}>Service Fee (INR):</span>
                           <span className="receipt-item-val" style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Rs. {selectedForm.fee || 0}</span>
                        </div>
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                           <span className="receipt-item-label" style={{ color: '#64748b' }}>Verification Status:</span>
                           <span className={`receipt-item-val badge ${submissionResult.payment_status === 'paid' ? 'badge-success' : submissionResult.payment_screenshot ? 'badge-warning' : 'badge-danger'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                            {(submissionResult.payment_status || 'unpaid').toUpperCase()}
                           </span>
                        </div>
                      </div>
 
                      {/* Instant screenshot upload direct link in Receipt */}
                      {submissionResult.payment_status !== 'paid' && (() => {
                        const fee = selectedForm.fee || 0;
                        const paymentNo = systemSettings.payment_number || '9385497906';
                        const upiUrl = `upi://pay?pa=${paymentNo}@upi&pn=TN%20sevai&am=${fee}&cu=INR&tn=TN_sevai_Pay_${submissionResult.id}`;
                        const qrCodeUrl = systemSettings.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;
                        const hideQr = !systemSettings.qr_code_url;

                        return (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                            <h4 style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                              <CreditCard size={15} style={{ color: 'var(--primary)' }} /> UPI Payment Transfer
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                              {/* Amount Display */}
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block', textTransform: 'uppercase' }}>Amount to Pay</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#10b981' }}>₹{fee}</span>
                              </div>

                              {/* QR Code */}
                              {!hideQr && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                  <img 
                                    src={qrCodeUrl} 
                                    alt="UPI Payment QR Code" 
                                    style={{ width: '120px', height: '120px', objectFit: 'contain' }} 
                                  />
                                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold' }}>Scan to Pay using GPAY / any UPI</span>
                                </div>
                              )}

                              {/* Intent pay button */}
                              <button 
                                onClick={() => handleUpiPay(fee, submissionResult.id)}
                                className="premium-btn"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px', 
                                  padding: '10px 16px', 
                                  width: '100%', 
                                  maxWidth: '220px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: '800',
                                  borderRadius: '8px',
                                  background: '#000000',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  transition: 'all 0.25s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                                  <path fill="#4285F4" d="M24 12.27c0-.81-.07-1.59-.2-2.34H12v4.42h6.08c-.26 1.39-1.04 2.57-2.21 3.34v2.73h3.64c2.13-1.96 3.36-4.85 3.36-8.15z"/>
                                  <path fill="#34A853" d="M12 24c3.04 0 5.58-1.01 7.44-2.73l-3.64-2.73c-1.01.68-2.3 1.08-3.8 1.08-2.92 0-5.39-1.97-6.27-4.62H2.04v2.81C3.88 21.05 7.55 24 12 24z"/>
                                  <path fill="#FBBC05" d="M5.73 15.02c-.22-.68-.35-1.41-.35-2.18s.13-1.5.35-2.18V7.85H2.04c-.7 1.4-1.1 2.97-1.1 4.63s.4 3.23 1.1 4.63l3.69-2.87z"/>
                                  <path fill="#EA4335" d="M12 4.8c1.64 0 3.11.56 4.27 1.66l3.2-3.2C17.58 1.44 15.04 0 12 0 7.55 0 3.88 2.95 2.04 7.02l3.69 2.87c.88-2.65 3.35-4.62 6.27-4.62z"/>
                                </svg>
                                Pay with <span style={{ fontWeight: '800', letterSpacing: '-0.2px' }}>GPay</span>
                              </button>

                              {/* Direct number */}
                              <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '100%' }}>
                                <p style={{ fontSize: '0.7rem', color: '#475569', margin: '0 0 2px 0' }}>
                                  Or send direct via GPay / UPI to number:
                                </p>
                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#1e293b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                  {paymentNo}
                                </span>
                              </div>
                            </div>

                            <label className="premium-btn premium-btn-success" style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', gap: '8px', cursor: 'pointer', justifyContent: 'center' }}>
                              <UploadCloud size={16} /> 
                              {uploadingScreenshotId === submissionResult.id ? 'Uploading proof...' : 'Select Payment Proof (Image or PDF File)'}
                              <input 
                                type="file" 
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                disabled={uploadingScreenshotId !== null}
                                onChange={(e) => handleScreenshotUpload(submissionResult.id, e.target.files[0])}
                              />
                            </label>
                          </div>
                        );
                      })()}
 
                      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        Thank you for using TN sevai! Save this receipt for status lookups.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button 
                        onClick={printReceipt} 
                        className="premium-btn premium-btn-success"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Printer size={18} /> Download PDF Receipt
                      </button>
                      <button 
                        onClick={() => handleTabChange('status')}
                        className="premium-btn premium-btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={18} /> Payment & Status Check
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: APPLICATION STATUS TRACKING & LOOKUP --- */}
        {activeTab === 'status' && (
          <div style={{ padding: '0 16px' }}>
            
            {/* If logged in: show status immediately. If guest: show search form first */}
            {!currentUser && (
              <form onSubmit={handleStatusLookup} className="premium-card" style={{ borderTop: '6px solid var(--primary)', margin: '16px 0' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '6px', color: '#1e293b' }}>Enquire Application Status</h3>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '16px' }}>Verify status of submitted certificates using your registered credentials.</p>

                {/* Lookup Identifier Type selector */}
                <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '8px', padding: '2px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setLookupType('phone'); setHasSearchedStatus(false); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: lookupType === 'phone' ? '#10b981' : 'transparent',
                      color: lookupType === 'phone' ? '#ffffff' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    Use Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLookupType('aadhar'); setHasSearchedStatus(false); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: lookupType === 'aadhar' ? '#10b981' : 'transparent',
                      color: lookupType === 'aadhar' ? '#ffffff' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    Use Aadhaar
                  </button>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Date of Birth *</label>
                  <input 
                    type="date" 
                    value={lookupDob} 
                    onChange={(e) => setLookupDob(e.target.value)} 
                    className="premium-input" 
                    required 
                  />
                </div>

                {lookupType === 'phone' ? (
                  <div className="premium-input-group">
                    <label className="premium-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      value={lookupPhone} 
                      onChange={(e) => setLookupPhone(e.target.value)} 
                      placeholder="10-digit Phone Number" 
                      maxLength={10} 
                      className="premium-input" 
                      required 
                    />
                  </div>
                ) : (
                  <div className="premium-input-group">
                    <label className="premium-label">Aadhaar Number *</label>
                    <input 
                      type="text" 
                      value={lookupAadhar} 
                      onChange={(e) => setLookupAadhar(e.target.value.replace(/\D/g, ''))} 
                      placeholder="12-digit Aadhaar Number" 
                      maxLength={12} 
                      className="premium-input" 
                      required 
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={searchingStatus}
                  className="premium-btn premium-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {searchingStatus ? (
                    <>
                      <div className="inner-spinner" style={{ width: '14px', height: '14px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Searching...
                    </>
                  ) : 'Enquire Status'}
                </button>
              </form>
            )}

            {/* Inline loader while searching status */}
            {searchingStatus && (
              <div className="premium-card text-center" style={{ padding: '40px 20px', marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div className="inner-spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--primary)', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Checking data from TN sevai database...</p>
              </div>
            )}

            {/* Results Board */}
            {!searchingStatus && hasSearchedStatus && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', margin: 0, color: '#1e293b' }}>
                    Active Submissions ({userApplications.length})
                  </h4>
                  {!currentUser && (
                    <button 
                      onClick={() => setHasSearchedStatus(false)}
                      className="premium-btn premium-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto' }}
                    >
                      New Search
                    </button>
                  )}
                </div>

                {userApplications.length === 0 ? (
                  <div className="premium-card text-center" style={{ padding: '40px 20px' }}>
                    <p className="text-muted">No applications found with these credentials.</p>
                  </div>
                ) : (
                  userApplications.map((app) => (
                    <div key={app.id} className="premium-card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', color: '#1e293b', fontWeight: '800', marginBottom: '2px' }}>
                            {forms.find(f => f.id === app.form_id)?.title || 'Application Form'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', display: 'block' }}>
                            Application ID: {app.id}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                            Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {app.payment_status === 'rejected' ? (
                            <span className="badge badge-danger" style={{ backgroundColor: '#ef4444' }}>Rejected</span>
                          ) : app.payment_status === 'draft' ? (
                            <span className="badge" style={{ backgroundColor: '#64748b', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>Draft</span>
                          ) : app.uploaded_pdf_url ? (
                            <span className="badge badge-success" style={{ backgroundColor: '#10b981' }}>Received</span>
                          ) : app.info_request_label && !app.info_request_response ? (
                            <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b' }}>Awaiting Upload</span>
                          ) : app.info_request_label && app.info_request_response ? (
                            <span className="badge badge-info" style={{ backgroundColor: '#3b82f6' }}>Upload Submitted</span>
                          ) : app.payment_status === 'paid' ? (
                            <span className="badge badge-success">Paid</span>
                          ) : app.payment_screenshot ? (
                            <span className="badge badge-warning">Verification Pending</span>
                          ) : (
                            <span className="badge badge-danger">Unpaid</span>
                          )}
                        </div>
                      </div>

                      {/* Payment Action for Unpaid Status */}
                      {app.payment_status === 'unpaid' && (() => {
                        const formTemplate = forms.find(f => f.id === app.form_id);
                        const fee = formTemplate?.fee || 0;
                        const paymentNo = systemSettings.payment_number || '9385497906';
                        const upiUrl = `upi://pay?pa=${paymentNo}@upi&pn=TN%20sevai&am=${fee}&cu=INR&tn=TN_sevai_Pay_${app.id}`;
                        const qrCodeUrl = systemSettings.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;
                        const hideQr = !systemSettings.qr_code_url;

                        if (app.payment_screenshot) {
                          const isProofPdf = checkIfPdf(app.payment_screenshot);
                          return (
                            <div style={{ 
                              background: '#fffbeb', 
                              border: '1.5px solid #fef3c7', 
                              borderRadius: '12px', 
                              padding: '16px', 
                              margin: '12px 0 16px 0',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                            }}>
                              <h4 style={{ fontSize: '0.9rem', color: '#b45309', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                                <Clock size={16} style={{ color: '#d97706' }} /> Waiting for Payment Verification
                              </h4>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 'bold' }}>
                                  You have uploaded a payment proof. Our administrative team will verify and approve your submission shortly.
                                </span>

                                {/* Uploaded proof preview */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isProofPdf ? (
                                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                        <FileText size={16} />
                                      </div>
                                    ) : (
                                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={getImageUrl(app.payment_screenshot)} alt="Payment Screenshot Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </div>
                                    )}
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155' }}>Uploaded Proof File</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <a 
                                      href={getImageUrl(app.payment_screenshot)} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ color: '#0f766e', background: '#ccfbf1', textDecoration: 'none', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #99f6e4' }}
                                    >
                                      <Eye size={11} /> View
                                    </a>
                                  </div>
                                </div>
                              </div>

                              {/* Allow Re-upload option */}
                              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                                  Need to update or replace your payment proof?
                                </span>
                                <label className="premium-btn premium-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', gap: '6px', cursor: 'pointer', background: 'white', width: 'auto' }}>
                                  <UploadCloud size={14} style={{ color: 'var(--primary)' }} /> 
                                  {uploadingScreenshotId === app.id ? 'Uploading proof...' : 'Replace Payment Proof'}
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    style={{ display: 'none' }}
                                    disabled={uploadingScreenshotId !== null}
                                    onChange={(e) => handleScreenshotUpload(app.id, e.target.files[0])}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div style={{ 
                            background: '#f8fafc', 
                            border: '1.5px solid #e2e8f0', 
                            borderRadius: '12px', 
                            padding: '16px', 
                            margin: '12px 0 16px 0',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                          }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                              <CreditCard size={16} style={{ color: 'var(--primary)' }} /> UPI Payment Transfer
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                              
                              {/* Amount Display */}
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount to Pay</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>₹{fee}</span>
                              </div>
                              
                              {/* QR Code Container */}
                              {!hideQr && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                  <img 
                                    src={qrCodeUrl} 
                                    alt="UPI Payment QR Code" 
                                    style={{ width: '130px', height: '130px', objectFit: 'contain' }} 
                                  />
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>Scan QR Code with any UPI App</span>
                                </div>
                              )}

                              {/* Pay Intent Button */}
                              <button 
                                onClick={() => handleUpiPay(fee, app.id)}
                                className="premium-btn"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px', 
                                  padding: '10px 16px', 
                                  width: '100%', 
                                  maxWidth: '220px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: '800',
                                  borderRadius: '8px',
                                  background: '#000000',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  transition: 'all 0.25s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                                  <path fill="#4285F4" d="M24 12.27c0-.81-.07-1.59-.2-2.34H12v4.42h6.08c-.26 1.39-1.04 2.57-2.21 3.34v2.73h3.64c2.13-1.96 3.36-4.85 3.36-8.15z"/>
                                  <path fill="#34A853" d="M12 24c3.04 0 5.58-1.01 7.44-2.73l-3.64-2.73c-1.01.68-2.3 1.08-3.8 1.08-2.92 0-5.39-1.97-6.27-4.62H2.04v2.81C3.88 21.05 7.55 24 12 24z"/>
                                  <path fill="#FBBC05" d="M5.73 15.02c-.22-.68-.35-1.41-.35-2.18s.13-1.5.35-2.18V7.85H2.04c-.7 1.4-1.1 2.97-1.1 4.63s.4 3.23 1.1 4.63l3.69-2.87z"/>
                                  <path fill="#EA4335" d="M12 4.8c1.64 0 3.11.56 4.27 1.66l3.2-3.2C17.58 1.44 15.04 0 12 0 7.55 0 3.88 2.95 2.04 7.02l3.69 2.87c.88-2.65 3.35-4.62 6.27-4.62z"/>
                                </svg>
                                Pay with <span style={{ fontWeight: '800', letterSpacing: '-0.2px' }}>GPay</span>
                              </button>

                              {/* Direct number */}
                              <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '10px', width: '100%' }}>
                                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 4px 0', fontWeight: '600' }}>
                                  Or send direct via GPay / UPI to number:
                                </p>
                                <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '4px', display: 'inline-block' }}>
                                  {paymentNo}
                                </span>
                              </div>
                            </div>

                            {/* Screenshot Upload Block */}
                            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                                Upload Payment Screenshot (Image / PDF):
                              </span>
                              <label className="premium-btn premium-btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', gap: '8px', cursor: 'pointer', background: 'white' }}>
                                <UploadCloud size={16} /> 
                                {uploadingScreenshotId === app.id ? 'Uploading proof...' : 'Select Payment Proof File'}
                                <input 
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  style={{ display: 'none' }}
                                  disabled={uploadingScreenshotId !== null}
                                  onChange={(e) => handleScreenshotUpload(app.id, e.target.files[0])}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Info Request from Admin section */}
                      {app.info_request_label && (
                        <div style={{ 
                          background: '#fffbeb', 
                          border: '1.5px solid #fde68a', 
                          borderLeft: '5px solid #d97706', 
                          borderRadius: '12px', 
                          padding: '16px', 
                          margin: '16px 0',
                          boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.05)'
                        }}>
                          <h5 style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 'bold', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={15} style={{ color: '#d97706' }} /> Action Required: Upload Document / Information Requested by Admin
                          </h5>
                          <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                            The administrator has requested the following: <strong style={{ color: '#9a3412', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>{app.info_request_label}</strong>
                          </p>

                          {!app.info_request_response ? (
                            // Render request submission input
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {app.info_request_type === 'file' ? (
                                <label className="premium-btn premium-btn-secondary" style={{ padding: '10px', fontSize: '0.8rem', display: 'flex', gap: '6px', cursor: 'pointer', background: 'white', border: '1.5px dashed #d97706', justifyContent: 'center' }}>
                                  <Upload size={16} style={{ color: '#d97706' }} />
                                  <span>{infoRequestFiles[app.id] ? infoRequestFiles[app.id].name : 'Select Image or PDF Document'}</span>
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setInfoRequestFiles(prev => ({ ...prev, [app.id]: e.target.files[0] }))}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              ) : (
                                <input 
                                  type="text" 
                                  value={infoRequestTexts[app.id] || ''} 
                                  onChange={(e) => setInfoRequestTexts(prev => ({ ...prev, [app.id]: e.target.value }))}
                                  placeholder="Type your answer response here..."
                                  className="premium-input"
                                  style={{ padding: '10px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1' }}
                                />
                              )}
                              
                              <button
                                type="button"
                                onClick={() => handleInfoRequestSubmit(app.id, app.info_request_type)}
                                className="premium-btn"
                                style={{ 
                                  backgroundColor: '#d97706', 
                                  color: 'white', 
                                  padding: '10px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                                }}
                              >
                                Submit Requested Details
                              </button>
                            </div>
                          ) : (
                            // Premium Render Response Preview with Download / View options
                            <div style={{ background: '#f59e0b', color: 'white', padding: '12px', borderRadius: '10px', fontSize: '0.75rem', border: '1px solid #d97706' }}>
                              <span style={{ fontWeight: '800', display: 'block', marginBottom: '8px', color: '#fef3c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Submitted Response:</span>
                              
                              {(app.info_request_response.startsWith('/uploads/') || app.info_request_response.startsWith('http')) ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {checkIfPdf(app.info_request_response) || app.info_request_response.includes('mimeType=application/pdf') ? (
                                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                        <FileText size={16} />
                                      </div>
                                    ) : (
                                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={getImageUrl(app.info_request_response)} alt="Response Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </div>
                                    )}
                                    <span style={{ fontWeight: 'bold' }}>Uploaded Document</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <a 
                                      href={getImageUrl(app.info_request_response)} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ color: 'white', background: 'rgba(255, 255, 255, 0.15)', textDecoration: 'none', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.25)' }}
                                    >
                                      <Eye size={11} /> View
                                    </a>
                                    <a 
                                      href={getImageUrl(app.info_request_response)} 
                                      download
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ color: '#b45309', background: '#ffffff', textDecoration: 'none', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                    >
                                      <Download size={11} /> Download
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: '700', color: '#ffffff' }}>
                                  {app.info_request_response}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Percent bar */}
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                          <span className="text-muted">Application Processing Progress:</span>
                          <span style={{ color: 'var(--primary)' }}>{app.progress_percent}%</span>
                        </div>
                        <div className="progress-container">
                          <div className="progress-bar-fill" style={{ width: `${app.progress_percent}%` }}></div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', lineHeight: '1.4' }}>
                          <strong>Current Update:</strong> {app.progress_desc || 'Form processed successfully.'}
                        </p>
                      </div>



                      {/* Documents Received from Admin */}
                      {(() => {
                        let docs = [
                          { key: 'receipt', title: 'Official Receipt', sub: 'Payment Receipt File', url: app.receipt_url },
                          { key: 'certificate', title: 'Official Certificate', sub: 'Processed Outcome Certificate', url: app.certificate_url },
                          { key: 'other', title: app.other_doc_name || 'Additional Document', sub: app.other_doc_name ? 'Official Custom Document' : 'Other uploaded attachment', url: app.other_doc_url },
                          { key: 'legacy', title: 'Processed Final Document', sub: 'Legacy outcome document', url: app.uploaded_pdf_url }
                        ].filter(d => !!d.url);

                        if (parseInt(app.progress_percent) === 100) {
                          docs = docs.filter(d => d.key === 'certificate' || d.key === 'legacy');
                        }

                        if (docs.length === 0) return null;

                        return (
                          <div style={{ marginTop: '16px', padding: '14px', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h5 style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 'bold', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileCheck size={16} style={{ color: '#16a34a' }} /> 📩 Received Documents from Administrator
                            </h5>
                            
                            {docs.map(doc => {
                              const isPdf = checkIfPdf(doc.url);
                              const ext = getFileExtension(doc.url);
                              return (
                                <div key={doc.key} style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '12px', 
                                  background: 'white', 
                                  padding: '16px', 
                                  borderRadius: '12px', 
                                  border: '1.5px solid #cbd5e1',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                                  position: 'relative'
                                }}>
                                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                    {/* Big Preview (PDF or Image) */}
                                    {isPdf ? (
                                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                                        <FileText size={28} />
                                      </div>
                                    ) : (
                                      <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <img 
                                          src={getImageUrl(doc.url)} 
                                          alt="Preview" 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                      </div>
                                    )}
                                    
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                      <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '800', display: 'block', marginBottom: '2px' }}>{doc.title}</span>
                                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>{doc.sub}</span>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block' }}>
                                        Format: {ext}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Buttons below preview */}
                                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #cbd5e1', paddingTop: '10px' }}>
                                    <a 
                                      href={getImageUrl(doc.url)} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="premium-btn premium-btn-secondary" 
                                      style={{ flex: 1, padding: '8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', margin: 0 }}
                                    >
                                      <Eye size={13} /> View Document
                                    </a>
                                    <a 
                                      href={getImageUrl(doc.url)} 
                                      download 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="premium-btn premium-btn-success" 
                                      style={{ flex: 1, padding: '8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', margin: 0 }}
                                    >
                                      <Download size={13} /> Download
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Resume Application for Drafts */}
                      {app.payment_status === 'draft' && (
                        <div style={{ 
                          background: '#f8fafc', 
                          border: '1.5px solid #e2e8f0', 
                          borderRadius: '12px', 
                          padding: '16px', 
                          margin: '16px 0 0 0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                            This application has been saved as a draft. You can resume filling out the form and submit it when ready.
                          </p>
                          <button
                            onClick={() => resumeApplicationDraft(app)}
                            className="premium-btn premium-btn-success"
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '8px', 
                              padding: '10px 16px', 
                              width: '100%', 
                              fontSize: '0.8rem', 
                              fontWeight: '800',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Resume Application <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <style>{`
            @keyframes spin-clockwise {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes spin-counter-clockwise {
              0% { transform: rotate(360deg); }
              100% { transform: rotate(0deg); }
            }
            @keyframes core-pulse {
              0%, 100% { transform: scale(0.85); opacity: 0.5; box-shadow: 0 0 12px rgba(16, 185, 129, 0.4); }
              50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 28px rgba(16, 185, 129, 0.9); }
            }
            @keyframes float-card {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-6px); }
            }
            @keyframes pulse-text {
              0%, 100% { opacity: 0.6; transform: scale(0.98); }
              50% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            padding: '40px 48px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1.5px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
            animation: 'float-card 4s ease-in-out infinite',
            width: '260px',
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{
                position: 'absolute',
                width: '74px',
                height: '74px',
                border: '4px solid transparent',
                borderTopColor: '#10b981',
                borderBottomColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin-clockwise 1.2s cubic-bezier(0.53, 0.21, 0.29, 0.83) infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                width: '54px',
                height: '54px',
                border: '3px solid transparent',
                borderLeftColor: '#6366f1',
                borderRightColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin-counter-clockwise 1s linear infinite'
              }}></div>
              <div style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                animation: 'core-pulse 2s ease-in-out infinite'
              }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: '900',
                color: '#10b981',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                animation: 'pulse-text 2s ease-in-out infinite'
              }}>
                {uploadProgress || 'Loading...'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                Please wait a moment
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- HELPER: WORD-LIKE DOCUMENT CONTENT PARSER ---
const parseDetailsDoc = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let tableKey = 0;

  const renderTable = () => {
    if (tableHeaders.length === 0 && tableRows.length === 0) return null;
    const currentHeaders = [...tableHeaders];
    const currentRows = [...tableRows];
    const currentKey = `table-${tableKey++}`;
    
    // Reset table parser state
    tableHeaders = [];
    tableRows = [];
    inTable = false;

    return (
      <div key={currentKey} className="table-responsive" style={{ margin: '14px 0', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          {currentHeaders.length > 0 && (
            <thead style={{ background: 'var(--primary)', color: 'white', fontWeight: 'bold' }}>
              <tr>
                {currentHeaders.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h.trim()}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {currentRows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: '8px 12px', color: '#475569' }}>{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();

    // Check if we are inside a table and this line is a table row (contains commas or is part of table)
    if (inTable) {
      if (line === '' || line.startsWith('H1:') || line.startsWith('H2:') || line.startsWith('H3:') || line.startsWith('---') || line.startsWith('line')) {
        // Close previous table
        elements.push(renderTable());
      } else {
        const parts = rawLine.split('$');
        if (tableHeaders.length === 0) {
          tableHeaders = parts;
        } else {
          tableRows.push(parts);
        }
        continue;
      }
    }

    if (line.startsWith('H1:')) {
      elements.push(
        <h4 key={idx} style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '16px 0 8px 0', borderBottom: '2.5px solid var(--primary)', paddingBottom: '4px' }}>
          {line.substring(3).trim()}
        </h4>
      );
    } else if (line.startsWith('H2:')) {
      elements.push(
        <h5 key={idx} style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: '14px 0 6px 0' }}>
          {line.substring(3).trim()}
        </h5>
      );
    } else if (line.startsWith('H3:')) {
      elements.push(
        <h6 key={idx} style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155', margin: '12px 0 4px 0' }}>
          {line.substring(3).trim()}
        </h6>
      );
    } else if (line === '---' || line.startsWith('line')) {
      elements.push(
        <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '14px 0' }} />
      );
    } else if (line === 'table:') {
      inTable = true;
      tableHeaders = [];
      tableRows = [];
    } else if (line !== '') {
      // Normal paragraph text
      elements.push(
        <p key={idx} style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.5', margin: '6px 0' }}>
          {rawLine}
        </p>
      );
    }
  }

  // If table is still open at the end of text
  if (inTable) {
    elements.push(renderTable());
  }

  return elements;
};
