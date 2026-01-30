import { handleInstallation } from '../handlers/installationHandler';
import { Context } from 'probot';

describe('installationHandler', () => {
  let mockContext: any;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: {
          getContent: jest.fn(),
          createOrUpdateFileContents: jest.fn(),
        },
      },
    };

    mockContext = {
      octokit: mockOctokit,
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
      payload: {},
    };
  });

  describe('installation.created event', () => {
    it('should create config file when it does not exist', async () => {
      mockContext.payload = {
        action: 'created',
        repositories: [
          {
            name: 'test-repo',
            full_name: 'testowner/test-repo',
          },
        ],
      };

      // Mock: file doesn't exist (404 error)
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 });
      
      // Mock: file creation succeeds
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});

      await handleInstallation(mockContext as Context<'installation.created'>);

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'test-repo',
        path: '.readmemuse.yml',
      });

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'test-repo',
        path: '.readmemuse.yml',
        message: 'Add ReadmeMuse configuration template',
        content: expect.any(String),
      });

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Created .readmemuse.yml')
      );
    });

    it('should not create config file when it already exists', async () => {
      mockContext.payload = {
        action: 'created',
        repositories: [
          {
            name: 'test-repo',
            full_name: 'testowner/test-repo',
          },
        ],
      };

      // Mock: file exists
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: 'existing content' },
      });

      await handleInstallation(mockContext as Context<'installation.created'>);

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalled();
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );
    });

    it('should handle multiple repositories', async () => {
      mockContext.payload = {
        action: 'created',
        repositories: [
          {
            name: 'repo1',
            full_name: 'testowner/repo1',
          },
          {
            name: 'repo2',
            full_name: 'testowner/repo2',
          },
        ],
      };

      // Mock: files don't exist
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 });
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});

      await handleInstallation(mockContext as Context<'installation.created'>);

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2);
    });

    it('should continue processing other repos if one fails', async () => {
      mockContext.payload = {
        action: 'created',
        repositories: [
          {
            name: 'repo1',
            full_name: 'testowner/repo1',
          },
          {
            name: 'repo2',
            full_name: 'testowner/repo2',
          },
        ],
      };

      // Mock: first repo fails, second succeeds
      mockOctokit.rest.repos.getContent
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockRejectedValueOnce({ status: 404 });

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});

      await handleInstallation(mockContext as Context<'installation.created'>);

      // Should have tried both repos
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(2);
      
      // Should have created config for the second repo
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(1);
      
      // Should have logged error for first repo
      expect(mockContext.log.error).toHaveBeenCalled();
    });
  });

  describe('installation_repositories.added event', () => {
    it('should create config file for newly added repositories', async () => {
      mockContext.payload = {
        action: 'added',
        repositories_added: [
          {
            name: 'new-repo',
            full_name: 'testowner/new-repo',
          },
        ],
      };

      // Mock: file doesn't exist
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 });
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});

      await handleInstallation(mockContext as Context<'installation_repositories.added'>);

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'new-repo',
        path: '.readmemuse.yml',
        message: 'Add ReadmeMuse configuration template',
        content: expect.any(String),
      });
    });
  });

  describe('config template content', () => {
    it('should create valid YAML template', async () => {
      mockContext.payload = {
        action: 'created',
        repositories: [
          {
            name: 'test-repo',
            full_name: 'testowner/test-repo',
          },
        ],
      };

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 });
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});

      await handleInstallation(mockContext as Context<'installation.created'>);

      const createCall = mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0];
      const templateContent = Buffer.from(createCall.content, 'base64').toString('utf-8');

      // Verify template contains expected sections
      expect(templateContent).toContain('watchPaths:');
      expect(templateContent).toContain('documentationFiles:');
      expect(templateContent).toContain('toneExamples:');
      expect(templateContent).toContain('src/**/*');
      expect(templateContent).toContain('README.md');
    });
  });
});
