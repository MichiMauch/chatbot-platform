import { Paper, Group, Text, ThemeIcon } from "@mantine/core";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "violet" | "orange" | "red" | "gray" | "cyan";
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  subtitle,
}: StatCardProps) {
  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} truncate>
            {title}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed" mt={2} truncate>
              {subtitle}
            </Text>
          )}
        </div>
        <ThemeIcon size="lg" radius="md" variant="light" color={color}>
          <Icon size={20} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
