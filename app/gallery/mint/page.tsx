'use client';

import React, { useState } from 'react';
import MintRegular from '@/components/MintRegular';
import MintAuction from '@/components/MintAuction';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UploadIcon from '@mui/icons-material/Upload';
import { useCreatePost, useCurrencies, OpenActionType, Amount, useSession } from '@lens-protocol/react-web';
import { useAccount } from 'wagmi';

const MintArt = () => {
  const { data: sessionData, error: sessionError, loading: sessionLoading } = useSession();

  const isAuthenticated = sessionData?.authenticated;
  const { address } = useAccount();

  const [selectedMintType, setSelectedMintType] = useState<'regular' | 'auction'>('regular');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isVideoOrAudio, setIsVideoOrAudio] = useState(false);
  const [addLinkInDescription, setAddLinkInDescription] = useState(false); // New state for checkbox

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : '');

    const extension = selectedFile?.name?.split('.')?.pop()?.toLowerCase();
    if (['mp4', 'mkv', 'avi', 'mp3', 'wav', 'flac'].includes(extension)) {
      setIsVideoOrAudio(true);
    } else {
      setIsVideoOrAudio(false);
    }
  };

  const handleCoverFileChange = (e) => {
    const selectedCoverFile = e.target.files[0];
    setCoverFile(selectedCoverFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setFileName(selectedFile ? selectedFile.name : '');

      const extension = selectedFile?.name?.split('.')?.pop()?.toLowerCase();
      if (['mp4', 'mkv', 'avi', 'mp3', 'wav', 'flac'].includes(extension)) {
        setIsVideoOrAudio(true);
      } else {
        setIsVideoOrAudio(false);
      }
    }
  };

  const triggerFileInput = () => {
    const fileUpload = document.getElementById('file-upload');
    if (fileUpload) {
      fileUpload.click();
    }
  };

  const triggerCoverFileInput = () => {
    const coverFileUpload = document.getElementById('cover-file-upload');
    if (coverFileUpload) {
      coverFileUpload.click();
    }
  };

  const renderPreview = () => {
    if (!file) return null;

    const extension = file?.name?.split('.')?.pop()?.toLowerCase();
    const url = URL.createObjectURL(file);

    if (extension && ['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return <img src={url} alt="Preview" className="w-full h-auto max-w-xs mt-4" />;
    } else if (extension && ['mp4', 'mkv', 'avi'].includes(extension)) {
      return <video src={url} controls className="w-full h-auto max-w-xs mt-4" />;
    } else if (extension && ['mp3', 'wav', 'flac'].includes(extension)) {
      return <audio src={url} controls className="w-full h-auto max-w-xs mt-4" />;
    }

    return null;
  };

  return (
    <main className="w-full max-w-4xl mx-auto py-12 md:py-16 px-4 md:px-6 mt-20">
      <div>
        <h1 className="text-3xl font-bold">Create Your 1/1 Art Listing</h1>
        <p className="text-gray-500 dark:text-gray-400">Mint Instantly on Lens and Share Your Art with the Entire Social Graph – Choose Auction or Buy Now.</p>
      </div>

      <div className="mt-4">
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="mintType"
            value="regular"
            checked={selectedMintType === 'regular'}
            onChange={() => setSelectedMintType('regular')}
          />
          <span className="ml-2">Buy Now</span>
        </label>
        <label className="inline-flex items-center ml-6">
          <input
            type="radio"
            name="mintType"
            value="auction"
            checked={selectedMintType === 'auction'}
            onChange={() => setSelectedMintType('auction')}
          />
          <span className="ml-2">Auction</span>
        </label>
      </div>

      <div className="space-y-6 mt-4">
        <div>
          <Label htmlFor="media">Upload Media</Label>
          <div
            className={`border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center space-y-2 transition-colors ${dragActive ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {fileName ? `Selected file: ${fileName}` : 'Drag and drop your image, video, or audio file here.'}
            </p>
            <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
            <Button size="sm" variant="outline" onClick={triggerFileInput}>
              Browse Files
            </Button>
            {renderPreview()}
          </div>
        </div>
        {isVideoOrAudio && (
          <div>
            <Label htmlFor="cover">Upload Cover Image</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center space-y-2 transition-colors">
              <UploadIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {coverFile ? `Selected cover: ${coverFile.name}` : 'Drag and drop your cover image here or click to browse.'}
              </p>
              <input type="file" onChange={handleCoverFileChange} className="hidden" id="cover-file-upload" />
              <Button size="sm" variant="outline" onClick={triggerCoverFileInput}>
                Browse Cover Files
              </Button>
              {coverFile && (
                <img src={URL.createObjectURL(coverFile)} alt="Cover Preview" className="w-full h-auto max-w-xs mt-4" />
              )}
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter the title of your NFT" />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your NFT" rows={4} />
        </div>
        {/* Checkbox to add a link in the description 
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={addLinkInDescription}
              onChange={() => setAddLinkInDescription(!addLinkInDescription)}
            />
            <Label className="ml-2 my-2">Add a link to the art in the description</Label>
          </label>
        </div>*/}
      </div>

      {selectedMintType === 'regular' ? (
        <MintRegular
          isAuthenticated={isAuthenticated && address}
          sessionData={sessionData}
          title={title}
          description={description}
          file={file}
          fileName={fileName}
          coverFile={coverFile}
          addLinkInDescription={addLinkInDescription}
        />
      ) : (
        <MintAuction
          isAuthenticated={isAuthenticated && address}
          userSessionData={sessionData}
          title={title}
          description={description}
          file={file}
          fileName={fileName}
          coverFile={coverFile}
          addLinkInDescription={addLinkInDescription} 
        />
      )}
    </main>
  );
};

export default MintArt;
