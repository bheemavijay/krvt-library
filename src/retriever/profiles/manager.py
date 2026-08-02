import os

class ProfileManager:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)
        if not os.path.exists(self.root_dir):
            os.makedirs(self.root_dir)

    def get_profile_path(self, name: str) -> str:
        profile_path = os.path.join(self.root_dir, name)
        if not os.path.exists(profile_path):
            os.makedirs(profile_path)
        return profile_path
