const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
  destination: './uploads/general',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const storageReport = multer.diskStorage({
  destination: './uploads/report',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Init upload for reports (PDF only)
const uploadReport = multer({
  storage: storageReport,
  limits:{fileSize: 10000000}, // 10MB limit
  fileFilter: function(req, file, cb){
    checkPDFFileType(file, cb);
  }
}).single('report');

const storageTemplate = multer.diskStorage({
  destination: './uploads/review-templates', 
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const uploadTemplate = multer({
  storage: storageTemplate,
  limits: {fileSize: 25000000}, // Slightly bumped to 25MB to accommodate larger code repo zips or datasets
  fileFilter: function(req, file, cb){
    // Pass true instantly—bypassing any extension or mime matching constraints entirely
    cb(null, true);
  }
}).single('reviewTemplate');

const storageMaterial = multer.diskStorage({
  destination: './uploads/materials',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const uploadMaterial = multer({
  storage: storageMaterial,
  limits: {fileSize: 10000000}, // 10MB limit for materials
  fileFilter: function(req, file, cb){
    // Validation happens at controller level based on MaterialSetting
    cb(null, true);
  }
}).single('material');


// Init upload for general files (templates and signatures)
const uploadGeneral = multer({
  storage: storage,
  limits:{fileSize: 10000000}, // 10MB limit
  fileFilter: function(req, file, cb){
    checkGeneralFileType(file, cb);
  }
});

// Check file type for PDFs
function checkPDFFileType(file, cb){
  // Allowed ext
  const filetypes = /pdf/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Error: PDFs Only!');
  }
}

// Check file type for general uploads (templates and images)
function checkGeneralFileType(file, cb){
  // Allowed extensions for templates and images
  const filetypes = /jpeg|jpg|png|gif|svg|docx|doc/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = /image|wordprocessingml|msword/.test(file.mimetype);

  if(mimetype && extname){
    return cb(null, true);
  } else {
    cb('Error: Only images (JPG, PNG, GIF, SVG) and Word documents (DOC, DOCX) are allowed!');
  }
}

// Export both upload configurations
module.exports=uploadReport;// Default export for backward compatibility
module.exports.reportUpload = uploadReport; 
module.exports.templateUpload=uploadTemplate;
module.exports.materialUpload=uploadMaterial;
module.exports.single = uploadGeneral.single.bind(uploadGeneral);
module.exports.array = uploadGeneral.array.bind(uploadGeneral);
module.exports.fields = uploadGeneral.fields.bind(uploadGeneral); 