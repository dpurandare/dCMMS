import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:file_picker/file_picker.dart';
import '../data/genai_repository.dart';
import 'document_list_screen.dart';

class ChatMessage {
  final String id;
  final String content;
  final bool isUser;
  final List<dynamic>? context;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.content,
    required this.isUser,
    this.context,
    required this.timestamp,
  });
}

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [
    ChatMessage(
      id: 'welcome',
      content:
          'Hello! I am your AI assistant. Ask me anything about maintenance or manuals.',
      isUser: false,
      timestamp: DateTime.now(),
    ),
  ];
  bool _isLoading = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final userMsg = ChatMessage(
      id: DateTime.now().toString(),
      content: text,
      isUser: true,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(userMsg);
      _isLoading = true;
      _controller.clear();
    });
    _scrollToBottom();

    try {
      final repo = ref.read(genAIRepositoryProvider);
      final response = await repo.chat(text);

      final botMsg = ChatMessage(
        id: DateTime.now().add(const Duration(milliseconds: 1)).toString(),
        content: response['answer'] ?? "I couldn't generate an answer.",
        isUser: false,
        context: response['context'],
        timestamp: DateTime.now(),
      );

      if (mounted) {
        setState(() {
          _messages.add(botMsg);
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(
            ChatMessage(
              id: DateTime.now().toString(),
              content: "Error: ${e.toString()}",
              isUser: false,
              timestamp: DateTime.now(),
            ),
          );
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _pollJobStatus(String jobId) async {
    final repo = ref.read(genAIRepositoryProvider);
    bool isComplete = false;
    int attempts = 0;

    while (!isComplete && attempts < 20) {
      // Timeout ~40s
      await Future.delayed(const Duration(seconds: 2));
      attempts++;

      try {
        final status = await repo.getJobStatus(jobId);
        if (status != null) {
          final state = status['state'];
          if (state == 'completed') {
            isComplete = true;
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Document processed successfully!'),
                ),
              );
            }
          } else if (state == 'failed') {
            isComplete = true;
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Processing failed: ${status['result']}'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
          // else: active/delayed/waiting
        }
      } catch (e) {
        print("Polling error: $e");
      }
    }
  }

  Future<void> _uploadDocument() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'txt'],
    );

    if (!mounted) return;

    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);

      try {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Uploading document...')));

        final repo = ref.read(genAIRepositoryProvider);
        final response = await repo.uploadDocument(file);

        // Handle Background Job
        if (response.containsKey('jobId')) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Upload queued. Processing...')),
            );
          }
          _pollJobStatus(response['jobId']);
        } else {
          // Legacy sync behavior
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Document uploaded successfully!')),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Upload failed: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Assistant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.list_alt),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const DocumentListScreen(),
                ),
              );
            },
            tooltip: 'Manage Documents',
          ),
          IconButton(
            icon: const Icon(Icons.upload_file),
            onPressed: _uploadDocument,
            tooltip: 'Upload Manual',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: msg.isUser
                        ? MainAxisAlignment.end
                        : MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!msg.isUser)
                        const CircleAvatar(
                          backgroundColor: Colors.green,
                          child: Icon(
                            Icons.smart_toy,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      if (!msg.isUser) const SizedBox(width: 8),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: msg.isUser
                                ? Theme.of(context).primaryColor
                                : Colors.grey[200],
                            borderRadius: BorderRadius.circular(16).copyWith(
                              topLeft: msg.isUser
                                  ? const Radius.circular(16)
                                  : Radius.zero,
                              topRight: !msg.isUser
                                  ? const Radius.circular(16)
                                  : Radius.zero,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              MarkdownBody(
                                data: msg.content,
                                styleSheet: MarkdownStyleSheet(
                                  p: TextStyle(
                                    color: msg.isUser
                                        ? Colors.white
                                        : Colors.black87,
                                  ),
                                ),
                              ),
                              if (msg.context != null &&
                                  (msg.context as List).isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    'Sources: ${(msg.context as List).length} citations',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontStyle: FontStyle.italic,
                                      color: msg.isUser
                                          ? Colors.white70
                                          : Colors.black54,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      if (msg.isUser) const SizedBox(width: 8),
                      if (msg.isUser)
                        const CircleAvatar(child: Icon(Icons.person, size: 16)),
                    ],
                  ),
                );
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: LinearProgressIndicator(),
            ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                boxShadow: [
                  BoxShadow(
                    color: Color.fromRGBO(0, 0, 0, 0.05),
                    offset: const Offset(0, -2),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(
                        hintText: 'Ask a question...',
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send),
                    color: Theme.of(context).primaryColor,
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
