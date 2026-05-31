/**
 * WhatsBro TNService - Google Workspace Serverless Backend
 * Language: Google Apps Script
 * Description: Serves as the JSON API backend using Google Sheets as the database and Google Drive for uploads.
 * Setup: Create a Google Spreadsheet, open "Extensions > Apps Script", paste this code, and deploy as a Web App.
 * Configuration: Set Web App access to "Execute as: Me" and "Who has access: Anyone".
 */

// --- GLOBAL CONFIGURATION ---
var ROOT_FOLDER_NAME = "WhatsBroTNService_Uploads";

// --- API ENTRY POINTS ---

/**
 * Handle HTTP GET Requests.
 * Exposes read operations.
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var responseData;
    
    // Auto-initialize spreadsheets and headers on first run
    initSpreadsheet();
    
    switch (action) {
      case "getForms":
        responseData = getFormsAction();
        break;
      case "getFormById":
        responseData = getFormByIdAction(e.parameter.id);
        break;
      case "getPosts":
        responseData = getPostsAction();
        break;
      case "getUsers":
        responseData = getUsersAction();
        break;
      case "getSubmissions":
        responseData = getSubmissionsAction();
        break;
      case "getUserStatus":
        responseData = getUserStatusAction(e.parameter.phone, e.parameter.dob, e.parameter.aadhar);
        break;
      case "getUserSubmissions":
        responseData = getUserSubmissionsAction(e.parameter.aadhar);
        break;
      default:
        return jsonResponse({ success: false, error: "Invalid GET Action: " + action }, 400);
    }
    
    return jsonResponse({ success: true, data: responseData });
  } catch (err) {
    logError("doGet", err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * Handle HTTP POST Requests.
 * Exposes create, update, delete, and file upload operations.
 */
function doPost(e) {
  try {
    // Parse the JSON request body
    var requestBody = JSON.parse(e.postData.contents);
    var action = requestBody.action;
    var responseData;
    
    // Auto-initialize spreadsheets and headers on first run
    initSpreadsheet();
    
    switch (action) {
      // Authentication and Citizen Profiles
      case "registerUser":
        responseData = registerUserAction(requestBody.payload);
        break;
      case "loginUser":
        responseData = loginUserAction(requestBody.payload);
        break;
      case "updateUserProfile":
        responseData = updateUserProfileAction(requestBody.userId, requestBody.payload);
        break;
        
      // Forms Template Operations
      case "createForm":
        responseData = createFormAction(requestBody.payload);
        break;
      case "updateForm":
        responseData = updateFormAction(requestBody.id, requestBody.payload);
        break;
      case "deleteForm":
        responseData = deleteFormAction(requestBody.id);
        break;
      case "duplicateForm":
        responseData = duplicateFormAction(requestBody.id);
        break;
        
      // Posts Operations
      case "createPost":
        responseData = createPostAction(requestBody.payload);
        break;
      case "updatePost":
        responseData = updatePostAction(requestBody.id, requestBody.payload);
        break;
      case "deletePost":
        responseData = deletePostAction(requestBody.id);
        break;
        
      // Submission Operations
      case "submitFormResponse":
        responseData = submitFormResponseAction(requestBody.payload);
        break;
      case "adminUpdateSubmission":
        responseData = adminUpdateSubmissionAction(requestBody.id, requestBody.payload);
        break;
      case "submitInfoRequestResponse":
        responseData = submitInfoRequestResponseAction(requestBody.id, requestBody.payload);
        break;
      case "deleteSubmission":
        responseData = deleteSubmissionAction(requestBody.id);
        break;
      case "deleteUserAndSubmissions":
        responseData = deleteUserAndSubmissionsAction(requestBody.aadhar);
        break;
        
      // File Uploads directly to Google Drive
      case "uploadFile":
        responseData = uploadFileAction(requestBody);
        break;
        
      default:
        return jsonResponse({ success: false, error: "Invalid POST Action: " + action }, 400);
    }
    
    return jsonResponse({ success: true, data: responseData });
  } catch (err) {
    logError("doPost", err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// --- DATABASE SERVICE ACTIONS ---

// --- 1. POSTS ACTIONS ---

function getPostsAction() {
  var rows = getRowsFromSheet("Posts");
  // Sort posts descending by id
  rows.sort(function(a, b) { return b.id - a.id; });
  return rows;
}

function createPostAction(postData) {
  var sheet = getSheet("Posts");
  var id = Date.now();
  var newPost = {
    id: id,
    title: postData.title || "",
    description: postData.description || "",
    img_url: postData.img_url || "",
    apply_url: postData.apply_url || "",
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newPost);
  return newPost;
}

function updatePostAction(id, postData) {
  var sheet = getSheet("Posts");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Post template not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  existingRow.title = postData.title !== undefined ? postData.title : existingRow.title;
  existingRow.description = postData.description !== undefined ? postData.description : existingRow.description;
  existingRow.img_url = postData.img_url !== undefined ? postData.img_url : existingRow.img_url;
  existingRow.apply_url = postData.apply_url !== undefined ? postData.apply_url : existingRow.apply_url;
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deletePostAction(id) {
  var sheet = getSheet("Posts");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Post template not found.");
  sheet.deleteRow(rowIndex);
  return { id: id, success: true };
}

// --- 2. FORMS ACTIONS ---

function getFormsAction() {
  var rows = getRowsFromSheet("Forms");
  return rows.map(function(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      fee: parseInt(row.fee) || 0,
      instructions: row.instructions,
      required_fields: parseJsonField(row.required_fields),
      required_docs: parseJsonField(row.required_docs),
      custom_docs: parseJsonField(row.custom_docs),
      fields: parseJsonField(row.fields),
      created_at: row.created_at
    };
  });
}

function getFormByIdAction(id) {
  var sheet = getSheet("Forms");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Form template not found.");
  
  var row = getRowObject(sheet, rowIndex);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    fee: parseInt(row.fee) || 0,
    instructions: row.instructions,
    required_fields: parseJsonField(row.required_fields),
    required_docs: parseJsonField(row.required_docs),
    custom_docs: parseJsonField(row.custom_docs),
    fields: parseJsonField(row.fields),
    created_at: row.created_at
  };
}

function createFormAction(formData) {
  var sheet = getSheet("Forms");
  var formId = "form-" + Math.random().toString(36).substring(2, 10);
  
  var newForm = {
    id: formId,
    title: formData.title,
    description: formData.description || "",
    category: formData.category || "E sevai",
    fee: parseInt(formData.fee) || 0,
    instructions: formData.instructions || "",
    required_fields: typeof formData.required_fields === "string" ? formData.required_fields : JSON.stringify(formData.required_fields || []),
    required_docs: typeof formData.required_docs === "string" ? formData.required_docs : JSON.stringify(formData.required_docs || []),
    custom_docs: typeof formData.custom_docs === "string" ? formData.custom_docs : JSON.stringify(formData.custom_docs || []),
    fields: typeof formData.fields === "string" ? formData.fields : JSON.stringify(formData.fields || []),
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newForm);
  return newForm;
}

function updateFormAction(id, formData) {
  var sheet = getSheet("Forms");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Form template not found.");
  
  var existingRow = getRowObject(sheet, rowIndex);
  if (formData.title !== undefined) existingRow.title = formData.title;
  if (formData.description !== undefined) existingRow.description = formData.description;
  if (formData.category !== undefined) existingRow.category = formData.category;
  if (formData.fee !== undefined) existingRow.fee = parseInt(formData.fee) || 0;
  if (formData.instructions !== undefined) existingRow.instructions = formData.instructions;
  if (formData.required_fields !== undefined) existingRow.required_fields = typeof formData.required_fields === "string" ? formData.required_fields : JSON.stringify(formData.required_fields);
  if (formData.required_docs !== undefined) existingRow.required_docs = typeof formData.required_docs === "string" ? formData.required_docs : JSON.stringify(formData.required_docs);
  if (formData.custom_docs !== undefined) existingRow.custom_docs = typeof formData.custom_docs === "string" ? formData.custom_docs : JSON.stringify(formData.custom_docs);
  if (formData.fields !== undefined) existingRow.fields = typeof formData.fields === "string" ? formData.fields : JSON.stringify(formData.fields);
  
  updateRowObject(sheet, rowIndex, existingRow);
  return existingRow;
}

function deleteFormAction(id) {
  var sheet = getSheet("Forms");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Form template not found.");
  sheet.deleteRow(rowIndex);
  
  // Also delete associated submissions
  var subSheet = getSheet("Submissions");
  var subData = subSheet.getDataRange().getValues();
  var subHeaders = subData[0];
  var formIdColIndex = subHeaders.indexOf("form_id");
  
  if (formIdColIndex !== -1) {
    // Delete rows bottom-to-top to maintain valid indices
    for (var r = subData.length - 1; r >= 1; r--) {
      if (subData[r][formIdColIndex] === id) {
        subSheet.deleteRow(r + 1);
      }
    }
  }
  
  return { id: id, success: true };
}

function duplicateFormAction(id) {
  var form = getFormByIdAction(id);
  var duplicatedForm = {
    title: form.title + " (Copy)",
    description: form.description,
    category: form.category,
    fee: form.fee,
    instructions: form.instructions,
    required_fields: form.required_fields,
    required_docs: form.required_docs,
    custom_docs: form.custom_docs,
    fields: form.fields
  };
  return createFormAction(duplicatedForm);
}

// --- 3. CITIZEN AUTHENTICATION ACTIONS ---

function registerUserAction(userData) {
  var sheet = getSheet("Users");
  var phoneClean = (userData.phone || "").toString().trim();
  var dobClean = (userData.dob || "").toString().trim();
  var aadharClean = userData.aadhar ? userData.aadhar.toString().trim() : "";
  
  // Enforce Unique constraint: phone + dob
  var existingRows = getRowsFromSheet("Users");
  var isRegistered = existingRows.some(function(u) {
    return u.phone.toString().trim() === phoneClean && u.dob.toString().trim() === dobClean;
  });
  if (isRegistered) {
    throw new Error("A user profile with this Phone number and DOB is already registered.");
  }
  
  // Aadhaar unique check if provided
  if (aadharClean) {
    var aadharDuplicate = existingRows.some(function(u) {
      return u.aadhar && u.aadhar.toString().trim() === aadharClean && u.dob.toString().trim() === dobClean;
    });
    if (aadharDuplicate) {
      throw new Error("A user profile with this Aadhaar number and DOB is already registered.");
    }
  }
  
  var userId = "usr-" + Math.random().toString(36).substring(2, 10);
  var newUser = {
    id: userId,
    name: userData.name || "",
    name_tamil: userData.name_tamil || "",
    dob: dobClean,
    phone: phoneClean,
    aadhar: aadharClean,
    gender: userData.gender || "",
    marital_status: userData.marital_status || "",
    father_name: userData.father_name || "",
    father_name_tamil: userData.father_name_tamil || "",
    mother_name: userData.mother_name || "",
    mother_name_tamil: userData.mother_name_tamil || "",
    community: userData.community || "",
    address: userData.address || "",
    religion: userData.religion || "",
    state: userData.state || "",
    district: userData.district || "",
    taluk: userData.taluk || "",
    revenue_village: userData.revenue_village || "",
    street_name: userData.street_name || "",
    door_no: userData.door_no || "",
    pincode: userData.pincode || "",
    photo_url: userData.photo_url || "",
    aadhar_url_1: userData.aadhar_url_1 || "",
    aadhar_url_2: userData.aadhar_url_2 || "",
    smart_card_url_1: userData.smart_card_url_1 || "",
    smart_card_url_2: userData.smart_card_url_2 || "",
    voter_id_url_1: userData.voter_id_url_1 || "",
    voter_id_url_2: userData.voter_id_url_2 || "",
    signature_url_1: userData.signature_url_1 || "",
    created_at: new Date().toISOString()
  };
  
  appendObjectToSheet(sheet, newUser);
  return newUser;
}

function loginUserAction(loginData) {
  var phoneClean = (loginData.phone || "").toString().trim();
  var dobClean = (loginData.dob || "").toString().trim();
  var aadharClean = loginData.aadhar ? loginData.aadhar.toString().trim() : "";
  
  var users = getRowsFromSheet("Users");
  var matchedUser = null;
  
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u.dob.toString().trim() === dobClean) {
      if (phoneClean && u.phone.toString().trim() === phoneClean) {
        matchedUser = u;
        break;
      } else if (aadharClean && u.aadhar && u.aadhar.toString().trim() === aadharClean) {
        matchedUser = u;
        break;
      }
    }
  }
  
  if (!matchedUser) {
    throw new Error("No user profile found matching these credentials. Please check DOB and details.");
  }
  
  return matchedUser;
}

function updateUserProfileAction(userId, profileData) {
  var sheet = getSheet("Users");
  var rowIndex = findRowIndexById(sheet, userId);
  if (rowIndex === -1) throw new Error("User profile not found.");
  
  var existingUser = getRowObject(sheet, rowIndex);
  
  // Map and update only defined values
  var keys = Object.keys(profileData);
  keys.forEach(function(key) {
    if (profileData[key] !== undefined && key !== "id") {
      existingUser[key] = profileData[key];
    }
  });
  
  updateRowObject(sheet, rowIndex, existingUser);
  return existingUser;
}

// --- 4. SUBMISSIONS & DATA COLLECTION ACTIONS ---

function submitFormResponseAction(payload) {
  var sheet = getSheet("Submissions");
  var subId = payload.id || "sub-" + Math.random().toString(36).substring(2, 10);
  
  var phone = (payload.phone || "").toString().trim();
  var dob = (payload.dob || "").toString().trim();
  var aadhar = payload.aadhar ? payload.aadhar.toString().trim() : "";
  
  // Find linked user_id if they have a registered profile
  var userId = "";
  try {
    var loggedUser = loginUserAction({ phone: phone, dob: dob, aadhar: aadhar });
    userId = loggedUser.id;
  } catch (e) {
    // User not registered, leave user_id blank
  }
  
  var responsesPack = payload.responses || {};
  var responsesString = typeof responsesPack === "string" ? responsesPack : JSON.stringify(responsesPack);
  
  var newSubmission = {
    id: subId,
    form_id: payload.form_id,
    user_id: userId,
    phone: phone,
    dob: dob,
    aadhar: aadhar,
    responses: responsesString,
    uploaded_docs: typeof payload.uploaded_docs === "string" ? payload.uploaded_docs : JSON.stringify(payload.uploaded_docs || {}),
    payment_status: payload.payment_status || "unpaid",
    payment_screenshot: payload.payment_screenshot || "",
    progress_percent: parseInt(payload.progress_percent) || 10,
    progress_desc: payload.progress_desc || "Application submitted successfully. Awaiting payment verification.",
    uploaded_pdf_url: payload.uploaded_pdf_url || "",
    submitted_at: new Date().toISOString(),
    info_request_label: payload.info_request_label || "",
    info_request_type: payload.info_request_type || "text",
    info_request_response: payload.info_request_response || ""
  };
  
  // --- DYNAMIC COLUMN MAPPING SYSTEM ---
  // We parse the responses pack and dynamically write them into columns of the Submissions sheet!
  var responsesObj = typeof responsesPack === "string" ? JSON.parse(responsesPack) : responsesPack;
  var responseKeys = Object.keys(responsesObj);
  
  // 1. Ensure sheet has columns for each custom question response
  responseKeys.forEach(function(qKey) {
    var colName = "Custom_" + qKey;
    ensureColumnExists(sheet, colName);
    newSubmission[colName] = responsesObj[qKey]; // Attach dynamic key-value
  });
  
  // Write or Append the submission
  var rowIndex = findRowIndexById(sheet, subId);
  if (rowIndex === -1) {
    appendObjectToSheet(sheet, newSubmission);
  } else {
    // Merge existing details and save updates
    var existingSub = getRowObject(sheet, rowIndex);
    var updateKeys = Object.keys(newSubmission);
    updateKeys.forEach(function(k) {
      if (newSubmission[k] !== undefined) existingSub[k] = newSubmission[k];
    });
    updateRowObject(sheet, rowIndex, existingSub);
  }
  
  return newSubmission;
}

function adminUpdateSubmissionAction(id, updateData) {
  var sheet = getSheet("Submissions");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Submission record not found.");
  
  var existingSub = getRowObject(sheet, rowIndex);
  
  // Map standard and dynamic updates
  var keys = Object.keys(updateData);
  keys.forEach(function(key) {
    if (updateData[key] !== undefined && key !== "id") {
      existingSub[key] = updateData[key];
    }
  });
  
  updateRowObject(sheet, rowIndex, existingSub);
  return existingSub;
}

function submitInfoRequestResponseAction(id, payload) {
  var sheet = getSheet("Submissions");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Submission record not found.");
  
  var existingSub = getRowObject(sheet, rowIndex);
  existingSub.info_request_response = payload.response;
  
  updateRowObject(sheet, rowIndex, existingSub);
  return existingSub;
}

function deleteSubmissionAction(id) {
  var sheet = getSheet("Submissions");
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("Submission not found.");
  sheet.deleteRow(rowIndex);
  return { id: id, success: true };
}

function deleteUserAndSubmissionsAction(aadhar) {
  // 1. Delete all submissions matching this Aadhaar card
  var subSheet = getSheet("Submissions");
  var subData = subSheet.getDataRange().getValues();
  var subHeaders = subData[0];
  var aadharColIndex = subHeaders.indexOf("aadhar");
  
  if (aadharColIndex !== -1) {
    for (var r = subData.length - 1; r >= 1; r--) {
      if (subData[r][aadharColIndex].toString().trim() === aadhar.toString().trim()) {
        subSheet.deleteRow(r + 1);
      }
    }
  }
  
  // 2. Delete user profile
  var userSheet = getSheet("Users");
  var userData = userSheet.getDataRange().getValues();
  var userHeaders = userData[0];
  var uAadharIndex = userHeaders.indexOf("aadhar");
  
  if (uAadharIndex !== -1) {
    for (var k = userData.length - 1; k >= 1; k--) {
      if (userData[k][uAadharIndex].toString().trim() === aadhar.toString().trim()) {
        userSheet.deleteRow(k + 1);
      }
    }
  }
  
  return { aadhar: aadhar, success: true };
}

function getUsersAction() {
  return getRowsFromSheet("Users");
}

function getSubmissionsAction() {
  var submissions = getRowsFromSheet("Submissions");
  return submissions.map(function(s) {
    return {
      id: s.id,
      form_id: s.form_id,
      user_id: s.user_id,
      phone: s.phone,
      dob: s.dob,
      aadhar: s.aadhar,
      responses: s.responses,
      uploaded_docs: s.uploaded_docs,
      payment_status: s.payment_status,
      payment_screenshot: s.payment_screenshot,
      progress_percent: parseInt(s.progress_percent) || 0,
      progress_desc: s.progress_desc,
      uploaded_pdf_url: s.uploaded_pdf_url,
      submitted_at: s.submitted_at,
      info_request_label: s.info_request_label,
      info_request_type: s.info_request_type,
      info_request_response: s.info_request_response
    };
  });
}

function getUserStatusAction(phone, dob, aadhar) {
  var submissions = getRowsFromSheet("Submissions");
  var dobClean = dob ? dob.toString().trim() : "";
  var phoneClean = phone ? phone.toString().trim() : "";
  var aadharClean = aadhar ? aadhar.toString().trim() : "";
  
  var filtered = submissions.filter(function(sub) {
    var matchDob = sub.dob.toString().trim() === dobClean;
    if (!matchDob) return false;
    
    if (phoneClean) {
      return sub.phone.toString().trim() === phoneClean;
    } else if (aadharClean) {
      return sub.aadhar && sub.aadhar.toString().trim() === aadharClean;
    }
    return false;
  });
  
  // Sort submissions descending by submitted_at
  filtered.sort(function(a, b) {
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });
  
  return filtered;
}

function getUserSubmissionsAction(aadhar) {
  var submissions = getRowsFromSheet("Submissions");
  var aadharClean = aadhar ? aadhar.toString().trim() : "";
  
  var filtered = submissions.filter(function(sub) {
    return sub.aadhar && sub.aadhar.toString().trim() === aadharClean;
  });
  
  filtered.sort(function(a, b) {
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });
  
  return filtered;
}

// --- 5. GOOGLE DRIVE FILE UPLOADS ---

function uploadFileAction(requestData) {
  var fileBase64 = requestData.fileData;
  var fileName = requestData.fileName;
  var mimeType = requestData.mimeType;
  var customPath = requestData.pathArray || [ROOT_FOLDER_NAME]; // e.g. ["WhatsBro_Uploads", "Form_Pan_Card", "User_1234"]
  
  // Ensure correct formatting
  if (!fileBase64 || !fileName || !mimeType) {
    throw new Error("Missing file upload payload options: fileData, fileName, mimeType required.");
  }
  
  // Decode base64 contents
  var decodedBytes = Utilities.base64Decode(fileBase64);
  var fileBlob = Utilities.newBlob(decodedBytes, mimeType, fileName);
  
  // Get/Create target folder structure recursively
  var targetFolder = getOrCreateFolderPath(customPath);
  
  // Save file to folder
  var uploadedFile = targetFolder.createFile(fileBlob);
  
  // Enable public sharing so that link is readable anywhere
  uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Generate download or shareable links
  return {
    fileName: fileName,
    fileUrl: uploadedFile.getUrl(), // Direct Drive viewer link
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + uploadedFile.getId() // Direct file stream download link
  };
}

// --- DATABASE CORE HELPERS & INITIALIZATION ---

/**
 * Ensures required sheets and standard headers are present.
 */
function initSpreadsheet() {
  // 1. FORMS SHEET
  ensureSheetExists("Forms", [
    "id", "title", "description", "category", "fee", "instructions", "required_fields", "required_docs", "custom_docs", "fields", "created_at"
  ]);
  
  // 2. USERS PROFILE SHEET
  ensureSheetExists("Users", [
    "id", "name", "name_tamil", "dob", "phone", "aadhar", "gender", "marital_status", "father_name", "father_name_tamil", "mother_name", "mother_name_tamil", "community", "address", "religion", "state", "district", "taluk", "revenue_village", "street_name", "door_no", "pincode", "photo_url", "aadhar_url_1", "aadhar_url_2", "smart_card_url_1", "smart_card_url_2", "voter_id_url_1", "voter_id_url_2", "signature_url_1", "created_at"
  ]);
  
  // 3. SUBMISSIONS SHEET
  ensureSheetExists("Submissions", [
    "id", "form_id", "user_id", "phone", "dob", "aadhar", "responses", "uploaded_docs", "payment_status", "payment_screenshot", "progress_percent", "progress_desc", "uploaded_pdf_url", "submitted_at", "info_request_label", "info_request_type", "info_request_response"
  ]);
  
  // 4. POSTS FEED SHEET
  ensureSheetExists("Posts", [
    "id", "title", "description", "img_url", "apply_url", "created_at"
  ]);
  
  // 5. SYSTEM ERROR/LOG SHEET
  ensureSheetExists("SystemLog", [
    "timestamp", "context", "message"
  ]);
  
  // Add initial mockup posts if Posts sheet is empty
  var postsSheet = getSheet("Posts");
  if (postsSheet.getLastRow() === 1) {
    appendObjectToSheet(postsSheet, {
      id: 1,
      title: "E-Sevai Quick Services",
      description: "Apply for Income Certificate, Community Certificate, and Nativity Certificate easily through our portal. Processing time: 3-5 working days.",
      img_url: "",
      apply_url: "/user?tab=apply&category=E%20sevai",
      created_at: new Date().toISOString()
    });
    appendObjectToSheet(postsSheet, {
      id: 2,
      title: "New PAN Card & Corrections",
      description: "Get a new PAN Card in 7 working days or make corrections in your existing PAN Card (Name, DOB, or Photo) with simple document submission.",
      img_url: "",
      apply_url: "/user?tab=apply&category=pan%20card",
      created_at: new Date().toISOString()
    });
    appendObjectToSheet(postsSheet, {
      id: 3,
      title: "Voter ID Registration",
      description: "New Voter Registration, address updates, or replacement voter ID card applications are active. Track status securely.",
      img_url: "",
      apply_url: "/user?tab=apply&category=voter%20id",
      created_at: new Date().toISOString()
    });
  }
}

function ensureSheetExists(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Write headers
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
  return sheet;
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Database Table Sheet not found: " + name);
  return sheet;
}

function getRowsFromSheet(sheetName) {
  var sheet = getSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return []; // Only headers
  
  var headers = values[0];
  var rows = [];
  
  for (var r = 1; r < values.length; r++) {
    var rowObject = {};
    for (var c = 0; c < headers.length; c++) {
      rowObject[headers[c]] = values[r][c];
    }
    rows.push(rowObject);
  }
  return rows;
}

function getRowObject(sheet, rowIndex) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var rowObject = {};
  for (var c = 0; c < headers.length; c++) {
    rowObject[headers[c]] = values[c];
  }
  return rowObject;
}

function appendObjectToSheet(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowValues = [];
  for (var c = 0; c < headers.length; c++) {
    rowValues.push(obj[headers[c]] !== undefined ? obj[headers[c]] : "");
  }
  sheet.appendRow(rowValues);
}

function updateRowObject(sheet, rowIndex, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowValues = [];
  for (var c = 0; c < headers.length; c++) {
    rowValues.push(obj[headers[c]] !== undefined ? obj[headers[c]] : "");
  }
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
}

function ensureColumnExists(sheet, colName) {
  var lastCol = sheet.getLastColumn();
  var headersRange = sheet.getRange(1, 1, 1, lastCol);
  var headers = headersRange.getValues()[0];
  
  if (headers.indexOf(colName) === -1) {
    // Append new column header
    var newColIdx = lastCol + 1;
    sheet.getRange(1, newColIdx).setValue(colName).setFontWeight("bold").setBackground("#cbd5e1");
  }
}

function findRowIndexById(sheet, id) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idColIndex = headers.indexOf("id");
  if (idColIndex === -1) return -1;
  
  var idStr = id.toString().trim();
  for (var r = 1; r < values.length; r++) {
    if (values[r][idColIndex].toString().trim() === idStr) {
      return r + 1; // 1-indexed row number
    }
  }
  return -1;
}

function getOrCreateFolderPath(pathArray) {
  var folder = DriveApp.getRootFolder();
  for (var i = 0; i < pathArray.length; i++) {
    var name = pathArray[i];
    var folders = folder.getFoldersByName(name);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      var newFolder = folder.createFolder(name);
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      folder = newFolder;
    }
  }
  return folder;
}

function parseJsonField(val) {
  if (!val) return [];
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}

function logError(context, err) {
  try {
    var sheet = getSheet("SystemLog");
    sheet.appendRow([new Date().toISOString(), context, err.toString()]);
  } catch (e) {
    // Fail silently to prevent infinite crash loops
  }
}

function jsonResponse(data, statusCode) {
  var outputString = JSON.stringify(data);
  return ContentService.createTextOutput(outputString)
    .setMimeType(ContentService.MimeType.JSON);
}
