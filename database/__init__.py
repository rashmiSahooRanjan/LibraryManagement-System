"""Database package initialization"""
from .mongodb import mongo, DatabaseInit

__all__ = ['mongo', 'DatabaseInit']
