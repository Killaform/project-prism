from flask_restful import Api

def setup_api(app):
    """Set up the REST API with all resources"""
    api = Api(app)
    
    # Import and register resources
    from perspective_engine.api.search import SearchResource
    from perspective_engine.api.auth import GoogleAuthResource, GoogleCallbackResource
    from perspective_engine.api.classify import ClassifyResource
    from perspective_engine.api.summarize import SummarizeResource
    from perspective_engine.api.fact_check import FactCheckResource
    from perspective_engine.api.verify import VerifyTokenResource
    
    # Register resources
    api.add_resource(SearchResource, '/search')
    api.add_resource(ClassifyResource, '/classify-perspectives')
    api.add_resource(SummarizeResource, '/summarize')
    api.add_resource(FactCheckResource, '/fact-check')
    api.add_resource(GoogleAuthResource, '/auth/google')
    api.add_resource(GoogleCallbackResource, '/auth/google/callback')
    api.add_resource(VerifyTokenResource, '/auth/verify')
    
    # Add non-resource routes
    from perspective_engine.api.auth import register_auth_routes
    register_auth_routes(app)
    
    return api