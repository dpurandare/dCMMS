import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../work_order_repository.dart';
import '../../sync/sync_repository.dart';

class WorkOrderListScreen extends ConsumerWidget {
  const WorkOrderListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workOrdersAsync = ref.watch(workOrderListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Work Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.smart_toy),
            tooltip: 'AI Assistant',
            onPressed: () => context.push('/genai'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await ref.read(syncRepositoryProvider).processQueue();
              // Invalidate list to refresh from DB in case sync pulled new data (not implemented yet)
              // ref.invalidate(workOrderListProvider);
            },
          ),
        ],
      ),
      body: workOrdersAsync.when(
        data: (workOrders) => workOrders.isEmpty
            ? const Center(child: Text('No work orders found'))
            : ListView.builder(
                itemCount: workOrders.length,
                itemBuilder: (context, index) {
                  final wo = workOrders[index];
                  return ListTile(
                    title: Text(wo.title),
                    subtitle: Text(wo.status),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.go('/work-orders/${wo.id}'),
                  );
                },
              ),
        error: (err, stack) => Center(child: Text('Error: $err')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Navigate to create
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

final workOrderListProvider = StreamProvider((ref) {
  final repo = ref.watch(workOrderRepositoryProvider);
  return repo.watchWorkOrders();
});
