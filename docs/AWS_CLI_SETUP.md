# AWS CLI Setup Guide

## Installation

The AWS CLI has been added to the project dependencies and is now installed.

**Installed Version:** aws-cli/2.22.22

## Configuration

### Method 1: Using Environment Variables (Recommended for this project)

The project already uses environment variables for AWS credentials. Make sure your `.env` file contains:

```bash
AWS_ACCESS_KEY=your_access_key_here
AWS_ACCESS_SECRET=your_secret_key_here
AWS_REGION=us-west-1
```

The Python scripts (`sync_actor_training_from_s3.py`, `sync_actor_training_to_s3.py`) will automatically use these credentials.

### Method 2: Using AWS CLI Configure

If you want to use AWS CLI commands directly from the terminal:

```bash
aws configure
```

You'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (use `us-west-1`)
- Default output format (use `json`)

## Verify Installation

Check AWS CLI version:
```bash
aws --version
```

Test AWS credentials:
```bash
aws s3 ls s3://story-boards-assets/system_actors/
```

## Common AWS CLI Commands for This Project

### List Actor Training Data in S3

```bash
# List all actors
aws s3 ls s3://story-boards-assets/system_actors/training_data/

# List specific actor's training images
aws s3 ls s3://story-boards-assets/system_actors/training_data/0002_european_35_female/
```

### Download Training Images Manually

```bash
# Download all training images for an actor
aws s3 sync s3://story-boards-assets/system_actors/training_data/0002_european_35_female/ \
  ./data/actors/0002_european_35_female/training_data/
```

### Upload Training Images Manually

```bash
# Upload all training images for an actor
aws s3 sync ./data/actors/0002_european_35_female/training_data/ \
  s3://story-boards-assets/system_actors/training_data/0002_european_35_female/ \
  --exclude "*.json"
```

### Check File Existence

```bash
# Check if a specific training image exists
aws s3 ls s3://story-boards-assets/system_actors/training_data/0002_european_35_female/0002_european_35_female_0.png
```

### Download Single File

```bash
# Download a specific training image
aws s3 cp s3://story-boards-assets/system_actors/training_data/0002_european_35_female/0002_european_35_female_0.png \
  ./data/actors/0002_european_35_female/training_data/
```

## Integration with Python Scripts

The Python scripts in `scripts/` use `boto3` (AWS SDK for Python) which shares credentials with AWS CLI:

- **sync_actor_training_from_s3.py** - Uses boto3 to download images
- **sync_actor_training_to_s3.py** - Uses boto3 to upload images

Both scripts will use credentials from:
1. Environment variables (`.env` file) - **Preferred**
2. AWS CLI configuration (`~/.aws/credentials`)
3. IAM role (if running on AWS)

## Troubleshooting

### "Unable to locate credentials"

**Solution:** Set environment variables in `.env` file or run `aws configure`

### "Access Denied"

**Solution:** Verify your AWS credentials have permissions for the `story-boards-assets` bucket

### "Region not found"

**Solution:** Set `AWS_REGION=us-west-1` in `.env` file

## S3 Bucket Structure

```
story-boards-assets/
└── system_actors/
    ├── lora_models/
    │   └── {actor_name}.safetensors
    ├── poster_frames/
    │   └── {actor_name}_poster*.webp
    └── training_data/
        └── {actor_name}/
            ├── {actor_name}_0.png
            ├── {actor_name}_1.png
            └── ...
```

## Best Practices

1. **Use environment variables** for credentials (don't commit `.env` to git)
2. **Use Python scripts** for automated sync operations
3. **Use AWS CLI** for manual inspection and one-off operations
4. **Test with one actor** before bulk operations
5. **Monitor costs** - S3 operations have associated costs

## Security Notes

- ⚠️ Never commit AWS credentials to git
- ✅ Use `.env` file (already in `.gitignore`)
- ✅ Rotate credentials regularly
- ✅ Use IAM roles with minimal required permissions

## Additional Resources

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
