import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const form = new formidable.IncomingForm();
    form.uploadDir = path.join(process.cwd(), 'public/uploads'); // Check if this path is correct
    form.keepExtensions = true;
    form.maxFileSize = 10 * 1024 * 1024; // 10MB limit

    try {
        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    console.error("Formidable error:", err);
                    return reject(err);
                }
                resolve([fields, files]);
            });
        });

        // 'file' is the name of the input field
        const uploadedFile = files.file[0] // Use the first element of the array

        if (!uploadedFile) {
             console.error("No file uploaded.");
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Verifica o tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
                              'text/plain', 'application/msword',
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!allowedTypes.includes(uploadedFile.mimetype)) {
          console.error("Invalid file type:", uploadedFile.mimetype);
          await fs.unlink(uploadedFile.filepath); // Delete the invalid file
          return res.status(400).json({ error: 'Invalid file type' });
        }


        const oldPath = uploadedFile.filepath;
        const newPath = path.join(form.uploadDir, uploadedFile.originalFilename);

         // Garante que o diretório de upload existe
        try {
            await fs.mkdir(form.uploadDir, { recursive: true });
        } catch (mkdirError) {
            if (mkdirError.code !== 'EEXIST') { // Ignore if the directory already exists
              console.error('Error creating upload directory:', mkdirError);
              throw mkdirError; // Re-throw if it's another error
            }
        }

        await fs.rename(oldPath, newPath); // Move the file

        // Return the URL of the uploaded file
        const fileUrl = `/uploads/${uploadedFile.originalFilename}`;
        return res.status(200).json({ url: fileUrl });

    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({ error: 'Error uploading file', details: error.message });
    }
}
