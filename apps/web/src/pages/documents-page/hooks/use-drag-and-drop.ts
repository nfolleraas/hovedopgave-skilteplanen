import type { DragEvent } from 'react';
import { useRef, useState } from 'react';

type UseDragAndDropOptions = {
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
};

export function useDragAndDrop({
  isUploading,
  uploadFiles,
}: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;

    if (dragDepthRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);

    if (isUploading) {
      return;
    }

    await uploadFiles(Array.from(event.dataTransfer.files));
  };

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDragging,
  };
}
