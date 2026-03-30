from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify
from django_summernote.fields import SummernoteTextField
from taggit.managers import TaggableManager
import re


def strip_editor_artifacts_html(html: str) -> str:
    if not html:
        return html

    # Remove wrapper elements that contain only a pasted UI SVG icon
    html = re.sub(
        r'<(?:button|span|div)\b[^>]*>\s*<svg\b[^>]*>.*?</svg>\s*</(?:button|span|div)>',
        '',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # Remove any remaining inline SVG blocks
    html = re.sub(
        r'<svg\b[^>]*>.*?</svg>',
        '',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # Clean up extra blank lines
    html = re.sub(r'\n{3,}', '\n\n', html)

    return html.strip()


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Post(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_posts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='posts')
    featured_image = models.ImageField(upload_to='blog/images/', blank=True, null=True)
    content = SummernoteTextField()
    excerpt = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    tags = TaggableManager()

    # Metadata for SEO
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if self.content:
            self.content = strip_editor_artifacts_html(self.content)
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f'Comment by {self.user.username} on {self.post.title}'