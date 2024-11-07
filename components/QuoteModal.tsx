import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateQuote } from '@lens-protocol/react-web';
import { textOnly } from "@lens-protocol/metadata";
import { uploadData } from '@/lib/utils';
import { Textarea } from './ui/textarea';

//todo: verificar session pra desabilitar o botão

function QuoteModal({ isOpen, onClose, postId }) {
  const [quoteText, setQuoteText] = useState('');
  const { execute: createQuote } = useCreateQuote();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuoteSubmit = async () => {
    if (!quoteText.trim()) return;

    setIsSubmitting(true);

    const metadata = textOnly({
      content: quoteText,
    });

    const arweaveID = await uploadData(metadata);
    const uri = `https://gateway.irys.xyz/${arweaveID}`;

    if (!uri) {
    throw new Error('Failed to upload metadata');
    }

    const result = await createQuote({
      quoteOn: postId,
      metadata: uri,
    });

    setIsSubmitting(false);

    if (result.isFailure()) {
      alert(result.error.message);
    } else {
      alert("Quote created successfully!");
      setQuoteText(''); 
      onClose(); // Close modal
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create Quote Post</h2>
        <Textarea
          value={quoteText}
          onChange={(e) => setQuoteText(e.target.value)}
          placeholder="Write your message..."
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleQuoteSubmit} variant="default" disabled={isSubmitting || !quoteText.trim()}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuoteModal;
