class UserDto {
    email: string;
    id: number;
    isactivated: boolean;
    constructor(model: any) {
        this.email = model.email;
        this.id = model.id;
        this.isactivated = model.isactivated;
    }
}

export default UserDto;