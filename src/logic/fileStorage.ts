import express from 'express';
import multer from 'multer';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const uploadFile = async (req: express.Request, res: express.Response) => {
    const file: any = req.file;
    const containerName = req.params.featureName;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const containerExists = await containerClient.exists();

        if (!containerExists) {
            return res.status(400).json({ error: 'Container does not exist' });
        }

        await containerClient.setAccessPolicy('blob');

        const fileExtension = file.originalname.split('.').pop();
        const blobName = `${uuidv4()}.${fileExtension}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype }
        });

        res.status(200).json({
            message: 'File uploaded successfully',
            storage: containerName,
            fileName: blobName,
            fileUrl: blockBlobClient.url
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
};

