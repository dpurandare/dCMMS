import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum DashboardWidgetType {
  stats,
  recentWorkOrders,
  activeAlerts,
  weather,
  quickActions,
}

class DashboardLayoutNotifier extends Notifier<List<DashboardWidgetType>> {
  static const String _storageKey = 'dashboard_layout_v1';

  @override
  List<DashboardWidgetType> build() {
    // Fire and forget load, UI will update when ready
    _loadLayout();

    // Return default initial state
    return [
      DashboardWidgetType.stats,
      DashboardWidgetType.quickActions,
      DashboardWidgetType.activeAlerts,
      DashboardWidgetType.recentWorkOrders,
      DashboardWidgetType.weather,
    ];
  }

  Future<void> _loadLayout() async {
    final prefs = await SharedPreferences.getInstance();
    final savedList = prefs.getStringList(_storageKey);

    if (savedList != null && savedList.isNotEmpty) {
      state = savedList
          .map(
            (e) => DashboardWidgetType.values.firstWhere(
              (enumVal) => enumVal.toString() == e,
              orElse: () => DashboardWidgetType.stats,
            ),
          )
          .toList();
    }
  }

  Future<void> saveLayout() async {
    final prefs = await SharedPreferences.getInstance();
    final stringList = state.map((e) => e.toString()).toList();
    await prefs.setStringList(_storageKey, stringList);
  }

  void reorder(int oldIndex, int newIndex) {
    if (oldIndex < newIndex) {
      newIndex -= 1;
    }
    final newState = [...state];
    final item = newState.removeAt(oldIndex);
    newState.insert(newIndex, item);
    state = newState;
    saveLayout();
  }

  void resetLayout() {
    state = [
      DashboardWidgetType.stats,
      DashboardWidgetType.quickActions,
      DashboardWidgetType.activeAlerts,
      DashboardWidgetType.recentWorkOrders,
      DashboardWidgetType.weather,
    ];
    saveLayout();
  }
}

final dashboardLayoutProvider =
    NotifierProvider<DashboardLayoutNotifier, List<DashboardWidgetType>>(
      DashboardLayoutNotifier.new,
    );
