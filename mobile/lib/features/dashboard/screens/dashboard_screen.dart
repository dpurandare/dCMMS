import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    final layout = ref.watch(dashboardLayoutProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reset Layout',
            onPressed: () {
              ref.read(dashboardLayoutProvider.notifier).resetLayout();
            },
          ),
        ],
      ),
      body: ReorderableListView(
        padding: const EdgeInsets.all(16.0),
        onReorder: (oldIndex, newIndex) {
          ref
              .read(dashboardLayoutProvider.notifier)
              .reorder(oldIndex, newIndex);
        },
        children: layout.map((type) {
          // Use a key for ReorderableListView to identify items
          return Container(
            key: ValueKey(type),
            margin: const EdgeInsets.only(bottom: 16.0),
            child: _buildWidget(type),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildWidget(DashboardWidgetType type) {
    switch (type) {
      case DashboardWidgetType.stats:
        return _buildCard(
          'Key Statistics',
          Icons.bar_chart,
          Colors.blue,
          const Column(
            children: [
              ListTile(title: Text('Total Power'), trailing: Text('142.5 MW')),
              ListTile(title: Text('Efficiency'), trailing: Text('98.2%')),
            ],
          ),
        );
      case DashboardWidgetType.recentWorkOrders:
        return _buildCard(
          'Recent Work Orders',
          Icons.work_outline,
          Colors.orange,
          const Text('No recent work orders assigned.'),
        );
      case DashboardWidgetType.activeAlerts:
        return _buildCard(
          'Active Alerts',
          Icons.warning_amber,
          Colors.red,
          const ListTile(
            leading: Icon(Icons.error, color: Colors.red),
            title: Text('Turbine T-104 Overheating'),
            subtitle: Text('Critical Priority'),
          ),
        );
      case DashboardWidgetType.weather:
        return _buildCard(
          'Site Weather',
          Icons.wb_sunny,
          Colors.amber,
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Column(children: [Icon(Icons.wind_power), Text('12 m/s')]),
              Column(children: [Icon(Icons.wb_sunny), Text('24°C')]),
              Column(children: [Icon(Icons.water_drop), Text('45%')]),
            ],
          ),
        );
      case DashboardWidgetType.quickActions:
        return _buildCard(
          'Quick Actions',
          Icons.flash_on,
          Colors.green,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton(onPressed: () {}, child: const Text('New WO')),
              ElevatedButton(onPressed: () {}, child: const Text('Scan QR')),
            ],
          ),
        );
    }
  }

  Widget _buildCard(String title, IconData icon, Color color, Widget content) {
    return Card(
      elevation: 4,
      child: Column(
        children: [
          Container(
            color: Color.fromRGBO(0, 0, 0, 0.05),
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                Icon(icon, color: color),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.drag_handle, color: Colors.grey),
              ],
            ),
          ),
          Padding(padding: const EdgeInsets.all(16.0), child: content),
        ],
      ),
    );
  }
}
