export declare const probot: any;
export declare const telegram: (event: {
    body: string;
}) => Promise<{
    statusCode: number;
    body: string;
}>;
