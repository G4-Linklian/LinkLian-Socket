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

export const uploadFiles = async (req: express.Request, res: express.Response) => {
    const { containerName, folderName } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const containerExists = await containerClient.exists();

        if (!containerExists) {
            return res.status(400).json({ error: 'Container does not exist' });
        }

        await containerClient.setAccessPolicy('blob');

        const uploadMultiple = files.map(async (file) => {
            const fileExtension = file.originalname.split('.').pop();
            const blobName = `${folderName}/${uuidv4()}.${fileExtension}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.uploadData(file.buffer, {
                blobHTTPHeaders: { blobContentType: file.mimetype }
            });

            return {
                originalName: file.originalname,
                fileType: fileExtension,
                fileName: blobName,
                fileUrl: blockBlobClient.url
            };
        });

        const uploadResult = await Promise.all(uploadMultiple);

        res.status(200).json({
            message: 'Files uploaded successfully',
            uploadedCount: uploadResult.length,
            container: containerName,
            folder: folderName,
            files: uploadResult
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
};

export const deleteFiles = async (req: express.Request, res: express.Response) => {
    const { containerName } = req.params;
    const { fileNames } = req.body as { fileNames: string[] };

    if (!fileNames || fileNames.length === 0) {
        return res.status(400).json({ error: 'No files provide to delete' });
    }

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const containerExists = await containerClient.exists();

        if (!containerExists) {
            return res.status(400).json({ error: 'Container does not exist' });
        }

        const deleteMultiple = fileNames.map(async (fileName) => {
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            await blockBlobClient.delete();

            return {
                fileName: fileName,
                fileUrl: blockBlobClient.url,
            };
        });

        const deleteResult = await Promise.allSettled(deleteMultiple);
        const successfulDeletes = deleteResult.filter(result => result.status === 'fulfilled').length;
        const failedDeletes = deleteResult.filter(result => result.status === 'rejected').length;

        res.status(200).json({
            message: 'Bulk delete operation completed',
            container: containerName,
            deletedCount: {
                successfulDeletes: successfulDeletes,
                failedDeletes: failedDeletes
            },
            files: deleteResult
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Delete failed' });
    }
};