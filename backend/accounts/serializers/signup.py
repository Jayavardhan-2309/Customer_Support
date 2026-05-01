from rest_framework import serializers

from custSupApp.models import Organization, User


class BaseSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}}


class SignupSerializer(BaseSignupSerializer):
    class Meta(BaseSignupSerializer.Meta):
        fields = ["username", "email", "password", "organization"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.role = "user"
        user.save()
        return user


class AdminSignupSerializer(BaseSignupSerializer):
    organization_name = serializers.CharField(write_only=True)

    class Meta(BaseSignupSerializer.Meta):
        fields = ["username", "email", "password", "organization_name"]

    def create(self, validated_data):
        org_name = validated_data.pop("organization_name")
        organization = Organization.objects.create(name=org_name)
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role="admin",
            organization=organization,
        )
