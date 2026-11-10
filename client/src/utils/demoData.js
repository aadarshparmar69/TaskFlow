export const DEMO_USER = {
  id: 1,
  public_id: 'aaaaaaaa-0001-4000-a000-000000000001',
  name: 'Alice Owner',
  email: 'alice@taskflow.dev',
  role: 'owner',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
};

export const DEMO_WORKSPACES = [
  {
    id: 1,
    public_id: 'bbbbbbbb-0001-4000-a000-000000000001',
    name: 'Acme Corp',
    slug: 'acme-corp',
    plan: 'enterprise',
  },
  {
    id: 2,
    public_id: 'bbbbbbbb-0002-4000-a000-000000000002',
    name: 'Startup Launchpad',
    slug: 'startup-launchpad',
    plan: 'pro',
  },
];

export const DEMO_BOARDS = [
  {
    id: 1,
    public_id: 'cccccccc-0001-4000-a000-000000000001',
    name: 'Product Roadmap',
    description: 'Quarterly product planning and feature tracking.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 2,
    public_id: 'cccccccc-0002-4000-a000-000000000002',
    name: 'Sprint Board (Engineering)',
    description: 'Active two-week sprint board for core engineering tasks.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 3,
    public_id: 'cccccccc-0003-4000-a000-000000000003',
    name: 'Bug Tracker & Triage',
    description: 'Track, reproduce, and prioritize user-reported bugs.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 4,
    public_id: 'cccccccc-0004-4000-a000-000000000004',
    name: 'MVP Launch & GTM',
    description: 'Cross-functional launch checklist for major v2 release.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 5,
    public_id: 'cccccccc-0005-4000-a000-000000000005',
    name: 'Marketing Campaigns',
    description: 'Content pipeline, newsletters, and growth experiments.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 6,
    public_id: 'cccccccc-0006-4000-a000-000000000006',
    name: 'Cloud Infrastructure & DevOps',
    description: 'Kubernetes migrations, CI/CD pipelines, and observability.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 7,
    public_id: 'cccccccc-0007-4000-a000-000000000007',
    name: 'Mobile App Redesign',
    description: 'iOS & Android design system harmonization and gestures.',
    workspace_id: 1,
    visibility: 'workspace',
  },
  {
    id: 8,
    public_id: 'cccccccc-0008-4000-a000-000000000008',
    name: 'Security & SOC 2 Compliance',
    description: 'Annual audits, penetration testing, and access controls.',
    workspace_id: 1,
    visibility: 'workspace',
  },
];

export const getDemoBoardPayload = (boardIdentifier) => {
  const board =
    DEMO_BOARDS.find(
      (b) =>
        b.public_id === boardIdentifier ||
        String(b.id) === String(boardIdentifier) ||
        b.name.toLowerCase().includes(String(boardIdentifier).toLowerCase())
    ) || DEMO_BOARDS[0];

  const lists = [
    { id: 101, public_id: 'lst_101', title: 'Backlog', position: 1000 },
    { id: 102, public_id: 'lst_102', title: 'In Progress', position: 2000 },
    { id: 103, public_id: 'lst_103', title: 'In Review', position: 3000 },
    { id: 104, public_id: 'lst_104', title: 'Done', position: 4000 },
  ];

  const labels = [
    { id: 1, name: 'Feature', color: '#6366f1' },
    { id: 2, name: 'Bug', color: '#ef4444' },
    { id: 3, name: 'Enhancement', color: '#10b981' },
    { id: 4, name: 'Security', color: '#dc2626' },
  ];

  const members = [
    { id: 1, name: 'Alice Owner', email: 'alice@taskflow.dev', role: 'owner' },
    { id: 2, name: 'Bob Admin', email: 'bob@taskflow.dev', role: 'admin' },
    { id: 3, name: 'Charlie Dev', email: 'charlie@taskflow.dev', role: 'member' },
  ];

  const cards = [
    {
      id: 201,
      public_id: 'crd_201',
      title: 'Architect ElevenLabs-inspired typography & palette',
      description: 'Implement EB Garamond headers with Inter body copy for warm luxury feel.',
      list_id: 104,
      position: 1000,
      priority: 'high',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      labels: [labels[0]],
      members: [members[0]],
      checklists: [
        {
          id: 1,
          title: 'Design items',
          items: [
            { id: 11, title: 'Color tokens', is_completed: true },
            { id: 12, title: 'Font imports', is_completed: true },
          ],
        },
      ],
    },
    {
      id: 202,
      public_id: 'crd_202',
      title: 'Real-time drag-and-drop Kanban board with dnd-kit',
      description: 'Smooth optimistic dragging across columns with float rank ordering.',
      list_id: 104,
      position: 2000,
      priority: 'critical',
      due_date: new Date(Date.now() + 172800000).toISOString(),
      labels: [labels[0], labels[2]],
      members: [members[0], members[1]],
      checklists: [],
    },
    {
      id: 203,
      public_id: 'crd_203',
      title: 'Multi-service deployment configuration for Vercel',
      description: 'Define services routing in vercel.json with service bindings and SPA rewrites.',
      list_id: 102,
      position: 1000,
      priority: 'high',
      due_date: new Date(Date.now() + 259200000).toISOString(),
      labels: [labels[0]],
      members: [members[2]],
      checklists: [],
    },
    {
      id: 204,
      public_id: 'crd_204',
      title: 'GraphQL Apollo Client integration and cache policy',
      description: 'Wire up GraphQL queries with normalized Apollo in-memory cache.',
      list_id: 102,
      position: 2000,
      priority: 'medium',
      due_date: null,
      labels: [labels[2]],
      members: [members[1]],
      checklists: [],
    },
    {
      id: 205,
      public_id: 'crd_205',
      title: 'Audit token rotation and rate limiting middleware',
      description: 'Ensure refresh tokens rotate correctly and family revocation works upon reuse.',
      list_id: 101,
      position: 1000,
      priority: 'high',
      due_date: new Date(Date.now() + 345600000).toISOString(),
      labels: [labels[3]],
      members: [members[0]],
      checklists: [],
    },
    {
      id: 206,
      public_id: 'crd_206',
      title: 'User profile avatar uploads with Cloudinary storage',
      description: 'Support multi-format image upload with optimistic previews.',
      list_id: 103,
      position: 1000,
      priority: 'low',
      due_date: null,
      labels: [labels[0]],
      members: [members[2]],
      checklists: [],
    },
  ];

  return {
    board,
    lists,
    cards,
    labels,
    members,
  };
};
