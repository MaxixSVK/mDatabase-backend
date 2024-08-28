const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const router = express.Router();

module.exports = function (pool) {
  const validate = require('./auth/tokenValidation')(pool, admin = true);

  const createStorage = () => {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    });
  };

  const upload = multer({ storage: createStorage() });

  router.post('/upload', validate, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).send({ msg: 'Please upload a file.' });
    }
    res.status(200).send({ filename: req.file.filename });
  });

  router.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send({ msg: 'File not found.' });
    }
  });

  router.delete('/images/:filename', validate, (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          res.next(err);
        }
        res.status(200).send({ msg: 'File deleted.' });
      });
    } else {
      res.status(404).send({ msg: 'File not found.' });
    }
  });

  router.get('/images', (req, res, next) => {
    const uploadPath = path.resolve(__dirname, '../../uploads');
    fs.readdir(uploadPath, (err, files) => {
      if (err) {
        res.next(err);
      }
      res.status(200).send(files);
    });
  });

  router.get('/img-backup', (req, res, next) => {
    const uploadPath = path.resolve(__dirname, '../../uploads');
  
    fs.readdir(uploadPath, (err, files) => {
      if (err) {
        res.next(err);
      }
  
      if (files.length === 0) {
        return res.status(404).send({ msg: 'No files to backup.' });
      }
  
      const currentDate = new Date().toISOString().split('T')[0];
      const zipFilename = `mdb-cdn-backup-${currentDate}.zip`;
      res.setHeader('Content-Disposition', `attachment; filename=${zipFilename}`);
      res.setHeader('Content-Type', 'application/zip');
  
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });
  
      archive.on('error', (err) => {
        res.status(500).send({ error: err.message });
      });
  
      archive.pipe(res);
  
      files.forEach((file) => {
        const filePath = path.join(uploadPath, file);
        archive.file(filePath, { name: file });
      });
  
      archive.finalize();
    });
  });

  return router;
};