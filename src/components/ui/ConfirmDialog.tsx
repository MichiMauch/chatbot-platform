"use client";

import { Modal, Button, Text, Center, ThemeIcon, Group, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const colorMap = {
    danger: "red",
    warning: "yellow",
    default: "blue",
  } as const;

  const color = colorMap[variant];

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      centered
      withCloseButton
      size="sm"
      padding="lg"
    >
      <Stack align="center" gap="md">
        <ThemeIcon size={48} radius="xl" color={color} variant="light">
          <IconAlertTriangle size={24} />
        </ThemeIcon>

        <Stack align="center" gap="xs">
          <Text size="lg" fw={600} ta="center">
            {title}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {description}
          </Text>
        </Stack>

        <Group w="100%" grow>
          <Button variant="light" color="gray" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button color={color} onClick={onConfirm} loading={isLoading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
