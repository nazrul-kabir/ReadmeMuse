import { createDraftPRWithChanges } from '../services/draftPRService';
import { DocSuggestion } from '../types/suggestion';

describe('draftPRService', () => {
  let mockContext: any;
  let mockPR: any;
  let mockSuggestions: DocSuggestion[];

  beforeEach(() => {
    // Setup mock context
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      },
      payload: {
        repository: {
          owner: {
            login: 'test-owner',
          },
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
        },
      },
      octokit: {
        rest: {
          git: {
            getRef: jest.fn(),
            createRef: jest.fn(),
            deleteRef: jest.fn(),
          },
          repos: {
            getContent: jest.fn(),
            createOrUpdateFileContents: jest.fn(),
          },
          pulls: {
            create: jest.fn(),
          },
          issues: {
            createComment: jest.fn(),
          },
        },
      },
    };

    mockPR = {
      number: 42,
      title: 'Test PR',
      body: 'Test PR body',
      base: {
        ref: 'main',
        sha: 'base-sha-123',
      },
      head: {
        ref: 'feature-branch',
      },
    };

    mockSuggestions = [
      {
        filePath: 'README.md',
        summary: 'Update README with new feature',
        reasoning: 'The PR adds a new feature that should be documented',
        diffPatch: `--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # Test Project
 
 This is a test project.
+New feature: Amazing feature added!`,
      },
    ];
  });

  describe('createDraftPRWithChanges', () => {
    it('should create a branch with correct naming convention', async () => {
      // Setup mocks
      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } }) // Base ref
        .mockRejectedValueOnce({ status: 404 }); // Branch doesn't exist

      mockContext.octokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Project\n\nThis is a test project.').toString('base64'),
          sha: 'file-sha-123',
        },
      });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: {
          number: 43,
        },
      });

      await createDraftPRWithChanges(mockContext, mockPR, mockSuggestions);

      // Verify branch creation with correct name
      expect(mockContext.octokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'refs/heads/readmemuse-sync-42',
        sha: 'base-sha-123',
      });
    });

    it('should delete existing branch if it exists', async () => {
      // Setup mocks - branch exists
      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } }) // Base ref
        .mockResolvedValueOnce({ data: { object: { sha: 'existing-branch-sha' } } }); // Existing branch

      mockContext.octokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Project').toString('base64'),
          sha: 'file-sha-123',
        },
      });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: { number: 43 },
      });

      await createDraftPRWithChanges(mockContext, mockPR, mockSuggestions);

      // Verify branch deletion
      expect(mockContext.octokit.rest.git.deleteRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'heads/readmemuse-sync-42',
      });
    });

    it('should apply file changes to the branch', async () => {
      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } })
        .mockRejectedValueOnce({ status: 404 });

      mockContext.octokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Test Project\n\nThis is a test project.').toString('base64'),
          sha: 'file-sha-123',
        },
      });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: { number: 43 },
      });

      await createDraftPRWithChanges(mockContext, mockPR, mockSuggestions);

      // Verify file update was called
      expect(mockContext.octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'README.md',
          message: 'docs: Update README with new feature',
          branch: 'readmemuse-sync-42',
          sha: 'file-sha-123',
        })
      );
    });

    it('should create a draft PR with correct properties', async () => {
      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } })
        .mockRejectedValueOnce({ status: 404 });

      mockContext.octokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          sha: 'file-sha-123',
        },
      });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: { number: 43 },
      });

      await createDraftPRWithChanges(mockContext, mockPR, mockSuggestions);

      // Verify draft PR creation
      expect(mockContext.octokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: '📝 ReadmeMuse: Documentation updates for PR #42',
        head: 'readmemuse-sync-42',
        base: 'main',
        body: expect.stringContaining('This draft PR contains suggested documentation updates'),
        draft: true,
      });
    });

    it('should comment on original PR with link to draft PR', async () => {
      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } })
        .mockRejectedValueOnce({ status: 404 });

      mockContext.octokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          sha: 'file-sha-123',
        },
      });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: { number: 43 },
      });

      await createDraftPRWithChanges(mockContext, mockPR, mockSuggestions);

      // Verify comment was posted
      expect(mockContext.octokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 42,
        body: expect.stringContaining('#43'),
      });
    });

    it('should handle multiple suggestions', async () => {
      const multipleSuggestions: DocSuggestion[] = [
        {
          filePath: 'README.md',
          summary: 'Update README',
          reasoning: 'Changes needed',
          diffPatch: '+ New content',
        },
        {
          filePath: 'docs/API.md',
          summary: 'Update API docs',
          reasoning: 'API changed',
          diffPatch: '+ API updates',
        },
      ];

      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } })
        .mockRejectedValueOnce({ status: 404 });

      mockContext.octokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          sha: 'file-sha-123',
        },
      });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: { number: 43 },
      });

      await createDraftPRWithChanges(mockContext, mockPR, multipleSuggestions);

      // Verify both files were updated
      expect(mockContext.octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2);
      expect(mockContext.octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'README.md' })
      );
      expect(mockContext.octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'docs/API.md' })
      );
    });

    it('should handle file creation when file does not exist', async () => {
      mockContext.octokit.rest.git.getRef
        .mockResolvedValueOnce({ data: { object: { sha: 'base-sha-123' } } })
        .mockRejectedValueOnce({ status: 404 });

      // File doesn't exist
      mockContext.octokit.rest.repos.getContent.mockRejectedValue({ status: 404 });

      mockContext.octokit.rest.pulls.create.mockResolvedValue({
        data: { number: 43 },
      });

      await createDraftPRWithChanges(mockContext, mockPR, mockSuggestions);

      // Verify file was created without SHA (new file)
      expect(mockContext.octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'README.md',
          sha: undefined,
        })
      );
    });

    it('should log errors and rethrow on failure', async () => {
      const error = new Error('API Error');
      mockContext.octokit.rest.git.getRef.mockRejectedValue(error);

      await expect(createDraftPRWithChanges(mockContext, mockPR, mockSuggestions)).rejects.toThrow('API Error');

      expect(mockContext.log.error).toHaveBeenCalled();
    });
  });
});
