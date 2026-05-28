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
          backgroundColor: '#0d0d1f',
          borderTopColor: '#1e1e3f',
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: '#00e5ff',
        tabBarInactiveTintColor: '#555570',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Missions',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🚀" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="station"
        options={{
          title: 'Station',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏗️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="galaxy"
        options={{
          title: 'Galaxy',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌌" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="story"
        options={{
          title: 'Chronicle',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎁" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Agent',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧑‍🚀" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
