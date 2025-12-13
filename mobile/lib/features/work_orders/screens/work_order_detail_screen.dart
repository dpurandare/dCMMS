import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../work_order_repository.dart';
import '../../../core/database/app_database.dart';

// Provider for Single WO
final workOrderDetailProvider = FutureProvider.autoDispose
    .family<WorkOrder?, String>((ref, id) {
      final repo = ref.watch(workOrderRepositoryProvider);
      return repo.getWorkOrder(id);
    });

class WorkOrderDetailScreen extends ConsumerWidget {
  final String id;
  const WorkOrderDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final woAsync = ref.watch(workOrderDetailProvider(id));

    return Scaffold(
      appBar: AppBar(title: Text('Work Order #$id')),
      body: woAsync.when(
        data: (wo) {
          if (wo == null)
            return const Center(child: Text('Work Order not found'));

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  wo.title,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Chip(label: Text(wo.status)),
                const SizedBox(height: 16),
                const Text(
                  'Description:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(wo.description),
                const SizedBox(height: 16),
                const Text(
                  'Priority:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(wo.priority),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      // TODO: Change Status (Start/Complete)
                    },
                    child: const Text('Start Work Order'),
                  ),
                ),
              ],
            ),
          );
        },
        error: (err, stack) => Center(child: Text('Error: $err')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
