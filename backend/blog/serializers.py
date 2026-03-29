from rest_framework import serializers
from .models import Category, Post, Comment
from taggit.serializers import (TagListSerializerField, TaggitSerializer)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class CommentSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'content', 'created_at']

class PostListSerializer(TaggitSerializer, serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagListSerializerField()
    author = serializers.StringRelatedField()

    class Meta:
        model = Post
        fields = [
            'id',
            'title',
            'slug',
            'author',
            'category',
            'featured_image',
            'excerpt',
            'created_at',
            'updated_at',
            'tags',
        ]

class PostDetailSerializer(TaggitSerializer, serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagListSerializerField()
    author = serializers.StringRelatedField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            'id',
            'title',
            'slug',
            'author',
            'category',
            'featured_image',
            'content',
            'excerpt',
            'created_at',
            'tags',
            'comments',
            'meta_title',
            'meta_description',
        ]