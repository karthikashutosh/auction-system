"use client";

import { useDropzone } from "react-dropzone";

import { Box, Button, Text, VStack } from "@chakra-ui/react";

interface FileUploadProps {
  file?: File;
  error?: string;
  onChange: (file?: File) => void;
}

export function FileUpload({ file, error, onChange }: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    multiple: false,
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];

      if (!selectedFile) return;

      onChange(selectedFile);
    },
  });

  return (
    <VStack align="stretch" gap={2}>
      <Box
        {...getRootProps()}
        cursor="pointer"
        border="2px dashed"
        borderRadius="xl"
        borderColor={isDragActive ? "blue.400" : "gray.300"}
        transition="all .2s"
        _hover={{
          borderColor: "blue.400",
          bg: "gray.50",
        }}
      >
        <input {...getInputProps()} />

        <VStack justify="center" align="center" h="180px" px={6}>
          <Text fontWeight="semibold">
            {file ? file.name : "Drag & drop image here"}
          </Text>

          <Text fontSize="sm" color="gray.500">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
              : "or click to browse"}
          </Text>

          {!file && (
            <Text fontSize="xs" color="gray.400">
              JPG, PNG, WEBP
            </Text>
          )}
        </VStack>
      </Box>

      {file && (
        <Button
          size="xs"
          variant="outline"
          alignSelf="flex-start"
          onClick={() => onChange(undefined)}
        >
          Remove Image
        </Button>
      )}

      {error && (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      )}
    </VStack>
  );
}
