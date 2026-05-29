import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#100d0a',
          borderTopColor: '#2a1f14',
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: '#d4791c',
        tabBarInactiveTintColor: '#5a4a3a',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Chores', tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} /> }}
      />
      <Tabs.Screen
        name="tower"
        options={{ title: 'Tower', tabBarIcon: ({ focused }) => <TabIcon emoji="🏰" focused={focused} /> }}
      />
      <Tabs.Screen
        name="character"
        options={{ title: 'Character', tabBarIcon: ({ focused }) => <TabIcon emoji="🧑" focused={focused} /> }}
      />
      <Tabs.Screen
        name="store"
        options={{ title: 'Store', tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} /> }}
      />
    </Tabs>
  );
}
