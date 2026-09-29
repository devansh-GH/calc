import Constants from "expo-constants";
import React from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Card, SectionLabel } from "../components/ui";

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      style={{ flex: 1 }}
      className="flex-1 bg-background dark:bg-background"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
    >
      <Box className="gap-1">
        <Text bold size="xl" className="text-foreground dark:text-foreground">
          SmartCalc
        </Text>
        <Text size="sm" className="text-muted-foreground dark:text-muted-foreground">
          A multi-currency calculator with a real parser and live reference rates.
        </Text>
      </Box>

      <Box className="gap-2">
        <SectionLabel>About</SectionLabel>
        <Card className="gap-3 p-4">
          <Text size="sm" className="leading-5 text-foreground dark:text-foreground">
            Type natural expressions like amounts with currencies and operators. SmartCalc
            tokenizes, parses, and evaluates them using cached Frankfurter exchange rates.
          </Text>
          <Text size="sm" className="leading-5 text-muted-foreground dark:text-muted-foreground">
            Rates are stored on device so calculations still work offline with the last known
            snapshot.
          </Text>
        </Card>
      </Box>

      <Box className="gap-2">
        <SectionLabel>App</SectionLabel>
        <Card className="gap-2 p-4">
          <Box className="flex-row items-center justify-between">
            <Text size="sm" className="text-muted-foreground dark:text-muted-foreground">
              Version
            </Text>
            <Text size="sm" bold className="text-foreground dark:text-foreground">
              {version}
            </Text>
          </Box>
          <Box className="flex-row items-center justify-between">
            <Text size="sm" className="text-muted-foreground dark:text-muted-foreground">
              Rates source
            </Text>
            <Text size="sm" bold className="text-foreground dark:text-foreground">
              Frankfurter
            </Text>
          </Box>
        </Card>
      </Box>
    </ScrollView>
  );
}
