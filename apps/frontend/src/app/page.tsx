import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <h1 className="text-6xl font-bold text-gray-900">
          Gonsai2
        </h1>
        <p className="text-2xl text-gray-600">
          AI-Powered n8n Workflow Management
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          <Link
            href="/workflows"
            className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Workflows</h2>
            <p className="text-gray-600">워크플로우 관리</p>
          </Link>
          <Link
            href="/executions"
            className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Executions</h2>
            <p className="text-gray-600">실행 내역</p>
          </Link>
          <Link
            href="/agents"
            className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">AI Agents</h2>
            <p className="text-gray-600">AI 에이전트 설정</p>
          </Link>
          <Link
            href="/monitoring"
            className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Monitoring</h2>
            <p className="text-gray-600">실시간 모니터링</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
