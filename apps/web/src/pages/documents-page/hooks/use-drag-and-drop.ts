import type { DragEvent } from 'react';
import { useRef, useState } from 'react';

type UseDragAndDropOptions = {
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
};

/**
 * Tracks drag depth and exposes handlers for document file drops.
 * @param options - The upload state and file upload callback
 * @returns Drag event handlers and whether a drag is active
 */
export function useDragAndDrop({
  isUploading,
  uploadFiles,
}: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  /**
   * Records a drag entering the drop zone or one of its descendants.
   * @param event - The drag-enter event
   */
  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;

    if (dragDepthRef.current === 1) {
      setIsDragging(true);
    }
  };

  /**
   * Records a drag leaving and clears the active state at the outer boundary.
   */
  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  /**
   * Allows files to be dropped and advertises the copy operation.
   * @param event - The drag-over event
   */
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  /**
   * Resets drag state and uploads files dropped in the zone.
   * @param event - The file-drop event
   * @returns A promise that resolves when the dropped files are processed
   */
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
