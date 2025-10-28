// components/Composer.tsx
import React, { memo, useRef, useState, useCallback, useEffect } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { ArrowUpIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Input } from "./ui/input";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

interface FileData {
  file: File;
  previewUrl?: string;
}

interface ComposerProps extends React.ComponentProps<"div"> {
  input: string;
  setInput: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  id?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

const Composer: React.FC<ComposerProps> = ({
  id,
  input,
  setInput,
  model,
  setModel,
  handleSubmit: onSubmit,
  isLoading,
  maxFileSize = 10 * 1024 * 1024,
  allowedFileTypes = ["image/", "text/", "application/pdf"],
  ...props
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileData[]>([]);

  // Clean up object URLs on unmount or when files change
  useEffect(() => {
    return () => {
      selectedFiles.forEach((fileData) => {
        if (fileData.previewUrl) {
          URL.revokeObjectURL(fileData.previewUrl);
        }
      });
    };
  }, [selectedFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const validateFile = useCallback(
    (file: File): { isValid: boolean; error?: string } => {
      if (file.size > maxFileSize) {
        return {
          isValid: false,
          error: `File ${file.name} exceeds ${Math.round(
            maxFileSize / (1024 * 1024)
          )}MB limit`,
        };
      }

      if (!allowedFileTypes.some((type) => file.type.startsWith(type))) {
        return {
          isValid: false,
          error: `File type ${file.type || "unknown"} is not supported`,
        };
      }

      return { isValid: true };
    },
    [maxFileSize, allowedFileTypes]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const validFiles: FileData[] = [];
      const errors: string[] = [];

      Array.from(files).forEach((file) => {
        const validation = validateFile(file);
        if (validation.isValid) {
          validFiles.push({
            file,
            previewUrl: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : undefined,
          });
        } else if (validation.error) {
          errors.push(validation.error);
        }
      });

      if (errors.length > 0) {
        console.warn("File validation errors:", errors);
      }

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => {
          const updatedFiles = [...prev, ...validFiles];
          return updatedFiles.slice(0, 20);
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [validateFile]
  );

  const handleRemove = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles((prev) => {
      prev.forEach((fileData) => {
        if (fileData.previewUrl) {
          URL.revokeObjectURL(fileData.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (isLoading) return;

      const text = input.trim();
      if (!text && selectedFiles.length === 0) return;

      // Call the submit handler from useChat
      onSubmit(e);

      // Reset files after submit
      clearAllFiles();
    },
    [input, selectedFiles, isLoading, onSubmit, clearAllFiles]
  );

  const debouncedSetInput = useDebouncedCallback(
    (value: string) => setInput(value),
    50 
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isSendDisabled =
    (!input.trim() && selectedFiles.length === 0) || isLoading;

  const modelName = model.length > 10 ? model.slice(0, 10) + "..." : model;

  return (
    <div {...props}>
      <AnimatePresence>
        <div className="grid w-full max-w-2xl mx-auto">
          <InputGroup>
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {selectedFiles.length > 0 && (
                <motion.div
                  className="grid grid-cols-4 md:grid-cols-8 gap-2 p-2 mt-2"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {selectedFiles.map((fileData, idx) => (
                    <div
                      key={`${fileData.file.name}-${idx}`}
                      className="relative flex flex-col items-center group"
                    >
                      <button
                        onClick={() => handleRemove(idx)}
                        className="absolute -right-1 -top-1 bg-black rounded-full shadow hover:bg-red-400 transition-colors duration-200 z-10"
                        aria-label={`Remove ${fileData.file.name}`}
                        type="button"
                      >
                        <IconX size={16} />
                      </button>

                      {fileData.previewUrl ? (
                        <div className="relative">
                          <Image
                            width={64}
                            height={64}
                            src={fileData.previewUrl}
                            alt={`Preview of ${fileData.file.name}`}
                            className="w-16 h-16 object-cover rounded border mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border mb-2 text-sm text-center wrap-break-word p-1"
                          title={fileData.file.name}
                        >
                          {fileData.file.name.split(".").pop()?.toUpperCase() ||
                            "FILE"}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            <InputGroupTextarea
              placeholder="Ask, Search or Chat..."
              value={input}
              onChange={(e) => debouncedSetInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              aria-label="Message input"
            />

            <InputGroupAddon align="block-end">
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleChange}
                className="hidden"
                multiple
                accept={allowedFileTypes.join(",")}
                aria-label="File upload"
              />

              <InputGroupButton
                variant="outline"
                className="rounded-full"
                size="icon-xs"
                onClick={handleClick}
                disabled={isLoading}
                aria-label="Add files"
                type="button"
              >
                <IconPlus />
              </InputGroupButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    disabled={isLoading}
                    aria-label="Select model"
                  >
                    {modelName}
                  </InputGroupButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="[--radius:0.95rem]"
                >
                  <DropdownMenuItem
                    onClick={() => setModel("gpt-4o-mini")}
                    aria-selected={model === "gpt-4o-mini"}
                  >
                    gpt-4o-mini
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setModel("google/gemini-2.5-flash")}
                    aria-selected={model === "gemini-2.5-flash"}
                  >
                    google/gemini-2.5-flash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setModel("nvidia/nemotron-nano-9b-v2:free")}
                    aria-selected={model === "nvidia/nemotron-nano-9b-v2:free"}
                  >
                    nvidia/nemotron-nano-9b-v2:free
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <InputGroupText className="ml-auto">52% used</InputGroupText>

              <Separator orientation="vertical" className="h-4!" />

              <InputGroupButton
                variant="default"
                className="rounded-full"
                size="icon-xs"
                onClick={handleSubmit}
                disabled={isSendDisabled}
                aria-label={isLoading ? "Sending..." : "Send message"}
                type="button"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <ArrowUpIcon />
                )}
                <span className="sr-only">
                  {isLoading ? "Sending..." : "Send"}
                </span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </AnimatePresence>
    </div>
  );
};

export default memo(Composer);
