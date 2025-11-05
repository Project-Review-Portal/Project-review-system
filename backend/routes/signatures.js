const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// Get all signatures
router.get('/', auth, async (req, res) => {
    try {
        const signaturesPath = path.join(__dirname, '../uploads/signatures');
        
        if (!fs.existsSync(signaturesPath)) {
            return res.json([]);
        }

        const files = fs.readdirSync(signaturesPath);
        const signatures = files
            .filter(file => file.match(/\.(jpg|jpeg|png|gif|svg)$/i))
            .map((file, index) => {
                const stats = fs.statSync(path.join(signaturesPath, file));
                return {
                    id: index + 1,
                    name: file.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
                    filename: file,
                    type: path.extname(file).toLowerCase(),
                    createdAt: stats.birthtime
                };
            });

        res.json(signatures);
    } catch (error) {
        console.error('Error fetching signatures:', error);
        res.status(500).json({ message: 'Server error while fetching signatures' });
    }
});

// Upload new signature
router.post('/', auth, authorize(['admin', 'coordinator']), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Signature name is required' });
        }

        // Check if file is a valid image format
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: 'Invalid file format. Only image files are allowed' });
        }

        // Create signatures directory if it doesn't exist
        const signaturesPath = path.join(__dirname, '../uploads/signatures');
        if (!fs.existsSync(signaturesPath)) {
            fs.mkdirSync(signaturesPath, { recursive: true });
        }

        // Generate filename
        const fileExtension = path.extname(req.file.originalname);
        const filename = `${name.replace(/[^a-zA-Z0-9]/g, '_')}${fileExtension}`;
        const filepath = path.join(signaturesPath, filename);

        // Move uploaded file to signatures directory
        fs.renameSync(req.file.path, filepath);

        res.json({
            message: 'Signature uploaded successfully',
            signature: {
                id: Date.now(),
                name: name,
                filename: filename,
                type: fileExtension.toLowerCase(),
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error uploading signature:', error);
        res.status(500).json({ message: 'Server error while uploading signature' });
    }
});

// Update signature
router.put('/:id', auth, authorize(['admin', 'coordinator']), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Signature name is required' });
        }

        const signaturesPath = path.join(__dirname, '../uploads/signatures');
        const files = fs.readdirSync(signaturesPath);
        const signatureIndex = parseInt(req.params.id) - 1;

        if (signatureIndex < 0 || signatureIndex >= files.length) {
            return res.status(404).json({ message: 'Signature not found' });
        }

        const oldFilename = files[signatureIndex];
        const fileExtension = path.extname(oldFilename);
        const newFilename = `${name.replace(/[^a-zA-Z0-9]/g, '_')}${fileExtension}`;
        
        const oldPath = path.join(signaturesPath, oldFilename);
        const newPath = path.join(signaturesPath, newFilename);

        // Rename the file
        fs.renameSync(oldPath, newPath);

        res.json({
            message: 'Signature updated successfully',
            signature: {
                id: req.params.id,
                name: name,
                filename: newFilename,
                type: fileExtension.toLowerCase()
            }
        });
    } catch (error) {
        console.error('Error updating signature:', error);
        res.status(500).json({ message: 'Server error while updating signature' });
    }
});

// Delete signature
router.delete('/:id', auth, authorize(['admin', 'coordinator']), async (req, res) => {
    try {
        const signaturesPath = path.join(__dirname, '../uploads/signatures');
        const files = fs.readdirSync(signaturesPath);
        const signatureIndex = parseInt(req.params.id) - 1;

        if (signatureIndex < 0 || signatureIndex >= files.length) {
            return res.status(404).json({ message: 'Signature not found' });
        }

        const filename = files[signatureIndex];
        const filepath = path.join(signaturesPath, filename);

        // Delete the file
        fs.unlinkSync(filepath);

        res.json({ message: 'Signature deleted successfully' });
    } catch (error) {
        console.error('Error deleting signature:', error);
        res.status(500).json({ message: 'Server error while deleting signature' });
    }
});

module.exports = router;
