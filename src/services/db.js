/**
 * WhatsBro TNService - Database Service
 * Interfaces between the React Frontend and the Google Apps Script Web App API.
 * Exposes a fallback mock system to allow local development and testing if the API is offline or not configured.
 */

import mockData from '../data.json';

// Get Google Apps Script Web App URL from Environment Variables
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

if (!GOOGLE_SCRIPT_URL) {
  console.warn(
    "Google Apps Script Web App URL not configured! " +
    "Defining VITE_GOOGLE_SCRIPT_URL in your environment variables (.env) is required for dynamic operations. " +
    "Falling back to local browser storage and static data.json mock for offline demo mode."
  );
}

// --- HELPER: FILE TO BASE64 ENCODER ---
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    // Extract base64 segment from Data URL string (remove prefix 'data:*/*;base64,')
    const base64Str = reader.result.split(',')[1];
    resolve(base64Str);
  };
  reader.onerror = (error) => reject(error);
});

// --- HELPER: CENTRALIZED JSON REST API CALLS ---
const callApi = async (action, payload = {}) => {
  if (!GOOGLE_SCRIPT_URL) {
    return callMockFallback(action, payload);
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight requests in Google Apps Script
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP Status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Unknown Apps Script Execution Failure");
    }

    return json.data;
  } catch (err) {
    console.error(`Google API Error on action [${action}]:`, err);
    throw err;
  }
};

const callApiGet = async (action, queryParams = {}) => {
  if (!GOOGLE_SCRIPT_URL) {
    return callMockFallback(action, queryParams);
  }

  try {
    const urlParams = new URLSearchParams({ action, ...queryParams });
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${urlParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP Status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Unknown Apps Script Execution Failure");
    }

    return json.data;
  } catch (err) {
    console.error(`Google GET API Error on action [${action}]:`, err);
    throw err;
  }
};

// --- HELPER: FILE UPLOADER TO GOOGLE DRIVE ---
const uploadFileToDrive = async (file, folderPathArray) => {
  if (!file) return null;
  
  try {
    const base64Data = await fileToBase64(file);
    const response = await callApi("uploadFile", {
      fileData: base64Data,
      fileName: file.name,
      mimeType: file.type,
      pathArray: folderPathArray
    });
    
    // For PDFs, use standard Drive Viewer URL for proper in-app preview rendering.
    // For images, use Direct Stream Download URL to allow direct native image rendering.
    if (file.type === 'application/pdf') {
      return response.fileUrl;
    }
    return response.downloadUrl;
  } catch (err) {
    console.error("File upload to Google Drive failed:", err);
    throw new Error("Failed to store file in Google Drive. Make sure file size is under 5MB.");
  }
};

// --- POSTS SERVICE ---
export const getPosts = async () => {
  return await callApiGet("getPosts");
};

export const createPost = async (postData) => {
  return await callApi("createPost", { payload: postData });
};

export const updatePost = async (id, postData) => {
  return await callApi("updatePost", { id, payload: postData });
};

export const deletePost = async (id) => {
  return await callApi("deletePost", { id });
};

export const uploadPostImage = async (file) => {
  // Save post banners in parent upload folder
  const url = await uploadFileToDrive(file, ["WhatsBroTNService_Uploads", "Post_Banners"]);
  return { img_url: url };
};

// --- FORMS SERVICE ---
export const getForms = async () => {
  return await callApiGet("getForms");
};

export const getFormById = async (id) => {
  return await callApiGet("getFormById", { id });
};

export const createForm = async (formData) => {
  return await callApi("createForm", { payload: formData });
};

export const updateForm = async (id, formData) => {
  return await callApi("updateForm", { id, payload: formData });
};

export const deleteForm = async (id) => {
  return await callApi("deleteForm", { id });
};

export const duplicateForm = async (id) => {
  return await callApi("duplicateForm", { id });
};

// --- SUBMISSIONS SERVICE ---
export const submitFormResponse = async (formId, phone, dob, aadhar, responses, status = "submitted") => {
  const payload = {
    form_id: formId,
    phone,
    dob,
    aadhar,
    responses,
    payment_status: "unpaid",
    progress_percent: 10,
    progress_desc: status === "draft" 
      ? "Application saved as Draft. Fill remaining details and submit when ready."
      : "Application submitted successfully. Awaiting payment verification.",
    info_request_label: "",
    info_request_type: "text",
    info_request_response: ""
  };
  
  return await callApi("submitFormResponse", { payload });
};

export const getUserStatus = async (phone, dob, aadhar) => {
  return await callApiGet("getUserStatus", { phone, dob, aadhar });
};

// --- CITIZEN PROFILE SERVICES ---
export const registerUser = async (userData) => {
  return await callApi("registerUser", { payload: userData });
};

export const loginUser = async (loginData) => {
  return await callApi("loginUser", { payload: loginData });
};

export const updateUserProfile = async (userId, profileData) => {
  return await callApi("updateUserProfile", { userId, payload: profileData });
};

export const uploadUserDocument = async (userId, docType, file1, file2 = null) => {
  // Resolve Folder path hierarchy for neat organization in Drive
  // Path: WhatsBroTNService_Uploads / Citizen_Profiles / User_[userId]
  const path = ["WhatsBroTNService_Uploads", "Citizen_Profiles", `User_${userId}`];
  
  const url1 = await uploadFileToDrive(file1, path);
  const url2 = file2 ? await uploadFileToDrive(file2, path) : null;
  
  const updates = {};
  if (docType === "photo") {
    updates.photo_url = url1;
  } else if (docType === "aadhar") {
    updates.aadhar_url_1 = url1;
    updates.aadhar_url_2 = url2;
  } else if (docType === "smart_card") {
    updates.smart_card_url_1 = url1;
    updates.smart_card_url_2 = url2;
  } else if (docType === "voter_id") {
    updates.voter_id_url_1 = url1;
    updates.voter_id_url_2 = url2;
  } else if (docType === "signature") {
    updates.signature_url_1 = url1;
  }
  
  return await updateUserProfile(userId, updates);
};

export const deleteUserDocument = async (userId, docType) => {
  const updates = {};
  if (docType === "photo") {
    updates.photo_url = "";
  } else if (docType === "aadhar") {
    updates.aadhar_url_1 = "";
    updates.aadhar_url_2 = "";
  } else if (docType === "smart_card") {
    updates.smart_card_url_1 = "";
    updates.smart_card_url_2 = "";
  } else if (docType === "voter_id") {
    updates.voter_id_url_1 = "";
    updates.voter_id_url_2 = "";
  } else if (docType === "signature") {
    updates.signature_url_1 = "";
  }
  
  return await updateUserProfile(userId, updates);
};

export const uploadSubmissionDocument = async (subId, docKey, file1, file2 = null) => {
  // Path: WhatsBroTNService_Uploads / Form_Submissions / Submission_[subId]
  const path = ["WhatsBroTNService_Uploads", "Form_Submissions", `Submission_${subId}`];
  
  const url1 = await uploadFileToDrive(file1, path);
  const url2 = file2 ? await uploadFileToDrive(file2, path) : null;
  
  // Get active submission to read and merge current docs list
  const subs = await callApiGet("getSubmissions");
  const sub = subs.find(s => s.id === subId);
  if (!sub) throw new Error("Submission not found in spreadsheet database");
  
  let currentDocs = {};
  if (sub.uploaded_docs) {
    currentDocs = typeof sub.uploaded_docs === 'string' ? JSON.parse(sub.uploaded_docs) : sub.uploaded_docs;
  }
  
  currentDocs[docKey] = url2 ? [url1, url2] : [url1];
  
  await callApi("adminUpdateSubmission", {
    id: subId,
    payload: { uploaded_docs: JSON.stringify(currentDocs) }
  });
  
  return {
    success: true,
    doc_key: docKey,
    urls: currentDocs[docKey]
  };
};

export const uploadPaymentScreenshot = async (subId, file) => {
  const path = ["WhatsBroTNService_Uploads", "Payments", `Submission_${subId}`];
  const url = await uploadFileToDrive(file, path);
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: {
      payment_screenshot: url,
      progress_desc: "Payment receipt uploaded. Admin is verifying your payment details."
    }
  });
};

export const uploadOutputPdf = async (subId, file) => {
  const path = ["WhatsBroTNService_Uploads", "Output_Certificates", `Submission_${subId}`];
  const url = await uploadFileToDrive(file, path);
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: {
      uploaded_pdf_url: url,
      progress_percent: 100,
      progress_desc: "Congratulations! Your official certificate has been verified, generated and uploaded."
    }
  });
};

export const adminUploadDoc = async (subId, docType, file) => {
  const path = ["WhatsBroTNService_Uploads", "Admin_Official_Docs", `Submission_${subId}`];
  const url = await uploadFileToDrive(file, path);
  
  const columnMap = {
    receipt: 'receipt_url',
    certificate: 'certificate_url',
    other: 'other_doc_url'
  };
  const dbColName = columnMap[docType];
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: { [dbColName]: url }
  });
};

export const adminDeleteDoc = async (subId, docType) => {
  const columnMap = {
    receipt: 'receipt_url',
    certificate: 'certificate_url',
    other: 'other_doc_url'
  };
  const dbColName = columnMap[docType];
  
  return await callApi("adminUpdateSubmission", {
    id: subId,
    payload: { [dbColName]: "" }
  });
};

// --- ADMIN USERS LIST SERVICES ---
export const getUsersList = async () => {
  const subs = await callApiGet("getSubmissions");
  const users = await callApiGet("getUsers");
  
  const seenAadhar = new Set();
  const uniqueUsers = [];
  
  // Compile list of unique active users based on their submissions list
  for (const sub of (subs || [])) {
    if (sub.aadhar && !seenAadhar.has(sub.aadhar)) {
      seenAadhar.add(sub.aadhar);
      const userProfile = (users || []).find(u => u.aadhar === sub.aadhar) || {};
      uniqueUsers.push({
        aadhar: sub.aadhar,
        phone: sub.phone,
        dob: sub.dob,
        last_active: sub.submitted_at,
        name: userProfile.name || 'Citizen User',
        photo_url: userProfile.photo_url || null,
        aadhar_url_1: userProfile.aadhar_url_1 || null,
        aadhar_url_2: userProfile.aadhar_url_2 || null,
        smart_card_url_1: userProfile.smart_card_url_1 || null,
        smart_card_url_2: userProfile.smart_card_url_2 || null,
        voter_id_url_1: userProfile.voter_id_url_1 || null,
        voter_id_url_2: userProfile.voter_id_url_2 || null,
        signature_url_1: userProfile.signature_url_1 || null
      });
    }
  }
  
  return uniqueUsers;
};

export const getSubmissionsByUser = async (aadhar) => {
  return await callApiGet("getUserSubmissions", { aadhar });
};

export const adminUpdateSubmission = async (subId, updateData) => {
  return await callApi("adminUpdateSubmission", { id: subId, payload: updateData });
};

export const deleteSubmission = async (subId) => {
  return await callApi("deleteSubmission", { id: subId });
};

export const deleteUserAndSubmissions = async (aadhar) => {
  return await callApi("deleteUserAndSubmissions", { aadhar });
};

export const submitInfoRequestResponse = async (subId, valueOrFile, isFile = false) => {
  let responseText = valueOrFile;
  
  if (isFile) {
    const path = ["WhatsBroTNService_Uploads", "Requested_Information", `Submission_${subId}`];
    responseText = await uploadFileToDrive(valueOrFile, path);
  }
  
  return await callApi("submitInfoRequestResponse", {
    id: subId,
    payload: { response: responseText }
  });
};

// --- MOCK DATABASE FALLBACK SYSTEM (LOCALSTORAGE) ---
const callMockFallback = (action, payload) => {
  console.log(`[Offline Mode] Simulating Action: ${action}`, payload);
  
  // Set up localStorage models
  if (!localStorage.getItem('mock_posts')) {
    localStorage.setItem('mock_posts', JSON.stringify(mockData.posts));
  }
  if (!localStorage.getItem('mock_forms')) {
    localStorage.setItem('mock_forms', JSON.stringify(mockData.forms));
  }
  if (!localStorage.getItem('mock_submissions')) {
    localStorage.setItem('mock_submissions', JSON.stringify(mockData.submissions));
  }
  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify(mockData.users));
  }

  const getMockList = (key) => JSON.parse(localStorage.getItem(key));
  const saveMockList = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  switch (action) {
    case "getPosts":
      return getMockList('mock_posts');
      
    case "createPost": {
      const list = getMockList('mock_posts');
      const newPost = { id: Date.now(), ...payload.payload, created_at: new Date().toISOString() };
      list.push(newPost);
      saveMockList('mock_posts', list);
      return newPost;
    }
    
    case "updatePost": {
      const list = getMockList('mock_posts');
      const idx = list.findIndex(p => p.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_posts', list);
        return list[idx];
      }
      throw new Error("Post template not found");
    }
    
    case "deletePost": {
      let list = getMockList('mock_posts');
      list = list.filter(p => p.id !== payload.id);
      saveMockList('mock_posts', list);
      return { success: true };
    }
    
    case "getForms":
      return getMockList('mock_forms');
      
    case "getFormById": {
      const list = getMockList('mock_forms');
      const form = list.find(f => f.id === payload.id);
      if (!form) throw new Error("Form not found");
      return form;
    }
    
    case "createForm": {
      const list = getMockList('mock_forms');
      const newForm = { id: `form-${Math.random().toString(36).substring(2, 8)}`, ...payload.payload, created_at: new Date().toISOString() };
      list.push(newForm);
      saveMockList('mock_forms', list);
      return newForm;
    }
    
    case "updateForm": {
      const list = getMockList('mock_forms');
      const idx = list.findIndex(f => f.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_forms', list);
        return list[idx];
      }
      throw new Error("Form template not found");
    }
    
    case "deleteForm": {
      let list = getMockList('mock_forms');
      list = list.filter(f => f.id !== payload.id);
      saveMockList('mock_forms', list);
      return { success: true };
    }
    
    case "duplicateForm": {
      const list = getMockList('mock_forms');
      const form = list.find(f => f.id === payload.id);
      if (!form) throw new Error("Form template not found");
      const dupe = { ...form, id: `form-${Math.random().toString(36).substring(2, 8)}`, title: `${form.title} (Copy)`, created_at: new Date().toISOString() };
      list.push(dupe);
      saveMockList('mock_forms', list);
      return dupe;
    }
    
    case "loginUser": {
      const list = getMockList('mock_users');
      const u = list.find(x => x.dob === payload.payload.dob && (x.phone === payload.payload.phone || x.aadhar === payload.payload.aadhar));
      if (!u) throw new Error("Citizen account not found matching DOB and credentials.");
      return u;
    }
    
    case "registerUser": {
      const list = getMockList('mock_users');
      const exists = list.some(x => x.dob === payload.payload.dob && x.phone === payload.payload.phone);
      if (exists) throw new Error("User profile already exists.");
      const newUser = { id: list.length + 1, ...payload.payload, created_at: new Date().toISOString() };
      list.push(newUser);
      saveMockList('mock_users', list);
      return newUser;
    }
    
    case "updateUserProfile": {
      const list = getMockList('mock_users');
      const idx = list.findIndex(x => x.id === payload.userId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_users', list);
        return list[idx];
      }
      throw new Error("Profile not found");
    }
    
    case "submitFormResponse": {
      const list = getMockList('mock_submissions');
      const sub = {
        id: `sub-${Math.random().toString(36).substring(2, 8)}`,
        submitted_at: new Date().toISOString(),
        ...payload.payload
      };
      list.push(sub);
      saveMockList('mock_submissions', list);
      return sub;
    }
    
    case "getSubmissions":
      return getMockList('mock_submissions');
      
    case "getUsers":
      return getMockList('mock_users');
      
    case "getUserStatus": {
      const list = getMockList('mock_submissions');
      return list.filter(s => s.dob === payload.dob && (s.phone === payload.phone || s.aadhar === payload.aadhar));
    }
    
    case "getUserSubmissions": {
      const list = getMockList('mock_submissions');
      return list.filter(s => s.aadhar === payload.aadhar);
    }
    
    case "adminUpdateSubmission": {
      const list = getMockList('mock_submissions');
      const idx = list.findIndex(s => s.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload.payload };
        saveMockList('mock_submissions', list);
        return list[idx];
      }
      throw new Error("Submission not found");
    }
    
    case "submitInfoRequestResponse": {
      const list = getMockList('mock_submissions');
      const idx = list.findIndex(s => s.id === payload.id);
      if (idx !== -1) {
        list[idx].info_request_response = payload.payload.response;
        saveMockList('mock_submissions', list);
        return list[idx];
      }
      throw new Error("Submission not found");
    }
    
    case "deleteSubmission": {
      let list = getMockList('mock_submissions');
      list = list.filter(s => s.id !== payload.id);
      saveMockList('mock_submissions', list);
      return { success: true };
    }
    
    case "deleteUserAndSubmissions": {
      let subs = getMockList('mock_submissions');
      subs = subs.filter(s => s.aadhar !== payload.aadhar);
      saveMockList('mock_submissions', subs);
      
      let users = getMockList('mock_users');
      users = users.filter(u => u.aadhar !== payload.aadhar);
      saveMockList('mock_users', users);
      return { success: true };
    }
    
    case "uploadFile":
      // Return a simulated URL
      return {
        fileName: payload.fileName,
        fileUrl: "https://drive.google.com/file/d/1MockDriveFileIDForDemoMode/view",
        downloadUrl: "https://drive.google.com/uc?export=download&id=1MockDriveFileIDForDemoMode"
      };
      
    default:
      console.warn("Unimplemented mock action: " + action);
      return null;
  }
};
