'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface EditImageButtonProps {
  imageId: string;
  originalUrl: string;
  editedUrl?: string | null;
  itemTitle?: string;
}

export function EditImageButton({
  imageId,
  originalUrl,
  editedUrl,
  itemTitle = 'Item',
}: EditImageButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditedUrl, setCurrentEditedUrl] = useState(editedUrl);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch(`/api/images/${imageId}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'remove background and replace on a clean white background to make it a product image to sell on ebay',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Image editing failed');
      }

      const data = await response.json();
      setCurrentEditedUrl(data.edited_url);

      // Refresh the page to show the updated image
      router.refresh();
    } catch (error: any) {
      console.error('Error editing image:', error);
      setError(error.message || 'Failed to edit image. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors"
        title="Edit image with AI"
      >
        {currentEditedUrl ? 'Re-edit' : 'Edit'} Image
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isEditing && setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Image - {itemTitle}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isEditing}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Before/After Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Original</p>
                    <div className="relative w-full h-64 bg-slate-100 rounded">
                      <Image
                        src={originalUrl}
                        alt="Original"
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      {currentEditedUrl ? 'Edited' : 'Preview (not yet edited)'}
                    </p>
                    <div className="relative w-full h-64 bg-slate-100 rounded flex items-center justify-center">
                      {currentEditedUrl ? (
                        <Image
                          src={currentEditedUrl}
                          alt="Edited"
                          fill
                          className="object-contain rounded"
                        />
                      ) : (
                        <p className="text-sm text-slate-400">
                          Click &quot;Remove Background&quot; to edit
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit Actions */}
                <div className="border-t pt-4">
                  <div className="bg-slate-50 rounded p-4 mb-4">
                    <p className="text-sm text-slate-700 mb-2">
                      <strong>AI Edit:</strong> Remove background and replace with clean white
                      background (perfect for eBay, Etsy, Facebook Marketplace)
                    </p>
                    <p className="text-xs text-slate-500">
                      Powered by Google Imagen 3 - Cost: ~$0.02 per image
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleEdit}
                      disabled={isEditing}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isEditing ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⏳</span>
                          Processing...
                        </>
                      ) : (
                        'Remove Background'
                      )}
                    </button>

                    <button
                      onClick={() => setIsModalOpen(false)}
                      disabled={isEditing}
                      className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
